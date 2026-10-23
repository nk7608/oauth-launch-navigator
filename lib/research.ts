// Retrieval in code (CLAUDE.md §7b step 3): fixed Tavily searches, relevance filter, extract, excerpt.
import "server-only";

export type Source = { id: string; url: string; title: string; content: string };

const TAVILY = "https://api.tavily.com";

async function tavily<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${TAVILY}/${path}`, {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${process.env.TAVILY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429 || res.status === 432 || res.status === 433) throw new Error("Tavily's free search credits are used up for now.");
  if (!res.ok) throw new Error(`Tavily ${path} → HTTP ${res.status}`);
  return res.json();
}

type SearchHit = { url: string; title: string; content: string; score: number };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export function searchQueries(app: string) {
  return [
    `${app} developer OAuth app create`,
    `${app} OAuth scopes`,
    `${app} app review OR verification OR marketplace approval`,
    `${app} partner program API access`,
    `${app} OAuth redirect URI`,
  ];
}

/**
 * Runs the fixed searches, keeps results that are actually about the app, ranks the provider's own domain first,
 * then extracts the top pages. Returns how many hits were about the app so callers can stop early (scenario H).
 */
export async function research(app: string, opts: { providerDomain?: string; signal?: AbortSignal; max?: number }) {
  const { providerDomain, signal, max = 9 } = opts;
  const queries = searchQueries(app);
  const results = await Promise.all(queries.map((query) => tavily<{ results: SearchHit[] }>("search", { query, search_depth: "basic", max_results: 6 }, signal)));
  const key = norm(app);
  const keyParts = app.toLowerCase().split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
  const providerRoot = providerDomain?.split(".").slice(-2).join(".");

  const seen = new Map<string, SearchHit & { rank: number }>();
  results.forEach((r) =>
    r.results.forEach((hit, i) => {
      const h = host(hit.url);
      if (!h || h.includes("preview.composio.dev")) return;
      const text = norm(`${hit.title} ${hit.url} ${hit.content.slice(0, 400)}`);
      const official = providerRoot ? h.endsWith(providerRoot) : false;
      const about = official || text.includes(key) || (keyParts.length > 1 && keyParts.every((p) => text.includes(p)));
      if (!about) return;
      const rank = (official ? 20 : 0) + (h.endsWith("composio.dev") ? 8 : 0) + hit.score * 5 - i;
      if (!seen.has(hit.url) || seen.get(hit.url)!.rank < rank) seen.set(hit.url, { ...hit, rank });
    }),
  );
  const relevant = [...seen.values()].sort((a, b) => b.rank - a.rank);
  if (relevant.length < 2) return { sources: [] as Source[], relevantCount: relevant.length, queries };

  const top = relevant.slice(0, max);
  const extracted = await tavily<{ results: { url: string; raw_content: string }[] }>("extract", { urls: top.map((t) => t.url), extract_depth: "basic" }, signal).catch((error) => {
    if (signal?.aborted) throw error;
    return { results: [] }; // Search snippets remain useful when extraction is throttled.
  });
  const sources = top
    .map((t) => ({ url: t.url, title: t.title, content: extracted.results.find((r) => r.url === t.url)?.raw_content ?? t.content }))
    .filter((s) => s.content)
    .map((s, i) => ({ ...s, id: `S${i + 1}`, content: excerpt(s.content) }));
  return { sources, relevantCount: relevant.length, queries };
}

const KW = /scope|verif|restricted|sensitive|redirect|callback|consent|review|approv|assessment|weeks|days|brand|privacy|client id|client secret|credentials|publish|testing|production|partner|marketplace|install|admin/i;

/** Keeps whole heading sections that look relevant, so tables keep their headings (~6k chars per source). */
export function excerpt(text: string, max = 6000) {
  const sections = text.split(/\n(?=#{1,4} )/);
  let out = "";
  for (const sec of sections.filter((s) => KW.test(s))) {
    const chunk = sec.trim().slice(0, max - out.length);
    if (chunk.length < 200 && out) break;
    out += chunk + "\n\n";
    if (out.length >= max) break;
  }
  return out || text.slice(0, max);
}
