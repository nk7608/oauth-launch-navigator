// One entry point for model calls. LLM_PROVIDER picks the backend; only OpenRouter is wired today.
import "server-only";

export type Message = { role: "system" | "user" | "assistant"; content: string };
export type Completion = { content: string; model: string };

/** The free daily request quota is used up; callers show a friendly message instead of an error page. */
export class QuotaError extends Error {}

const DEFAULT_FALLBACKS = ["recursive/flint-v1.0:free"];

export async function complete(messages: Message[], opts: { json?: boolean; signal?: AbortSignal } = {}): Promise<Completion> {
  const provider = process.env.LLM_PROVIDER || "openrouter";
  if (provider !== "openrouter") throw new Error(`LLM_PROVIDER "${provider}" isn't wired up yet; use "openrouter".`);
  return openrouter(messages, opts);
}

async function openrouter(messages: Message[], { json, signal }: { json?: boolean; signal?: AbortSignal }): Promise<Completion> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  const primary = process.env.LLM_MODEL || "dots-studio/dots-3-note-preview:free";
  const fallbacks = (process.env.LLM_FALLBACK_MODELS?.split(",").map((s) => s.trim()).filter(Boolean) ?? DEFAULT_FALLBACKS).filter((m) => m !== primary);

  // OpenRouter tries `models` in order when a provider is down or rate-limited; it counts as one request.
  const body = {
    models: [primary, ...fallbacks],
    messages,
    temperature: 0.2,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "OAuth Launch Navigator" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    const err = data.error;
    if (!err && res.ok) {
      const content: string = data.choices?.[0]?.message?.content ?? "";
      return { content, model: data.model ?? primary };
    }
    const message = String(err?.metadata?.raw ?? err?.message ?? res.statusText);
    if (/free-models-per-day|daily limit|credits/i.test(message) && (err?.code === 429 || res.status === 429 || res.status === 402)) {
      throw new QuotaError("Today's free AI quota is used up.");
    }
    // Upstream rate limits on free models are usually brief; wait once and retry the whole list.
    if ((err?.code === 429 || res.status === 429) && attempt === 0) {
      await new Promise((r) => setTimeout(r, 8000));
      continue;
    }
    throw new Error(`Model call failed (${err?.code ?? res.status}): ${message.slice(0, 200)}`);
  }
  throw new Error("Model call failed after retry");
}

/** Remaining free requests today, or undefined if OpenRouter doesn't say. */
export async function remainingQuota(): Promise<number | undefined> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } });
    const d = (await res.json()).data;
    if (typeof d?.limit_remaining === "number") return d.limit_remaining;
    return undefined;
  } catch {
    return undefined;
  }
}

/** Pull the first JSON object out of a model reply (tolerates code fences and stray prose). */
export function parseJsonReply(text: string): unknown {
  const cleaned = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("The model didn't return JSON");
  }
}
