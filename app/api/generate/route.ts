// POST /api/generate {query} → { runId } to stream from /api/generate/<runId>, or { slug, cached } when a plan exists.
import type { NextRequest } from "next/server";
import { OAUTH_SCHEMES, resolveApp } from "@/lib/apps";
import { findToolkit, type ToolkitFacts } from "@/lib/composio";
import { generationSetupIssue } from "@/lib/config";
import { loadGuide } from "@/lib/guides";
import { remainingQuota } from "@/lib/llm";
import { identify, notOAuthPlan, starterPlan } from "@/lib/pipeline";
import { activeRunFor, createRun, getStoredPlan, markActive, savePlan, takeVisitorSlot, tooManyActive, visitorId } from "@/lib/runs";

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => ({}));
  const body = input && typeof input === "object" ? input : {};
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 200) : "";
  if (!query) return Response.json({ code: "bad_request", message: "Send { query: \"app name or website\" }." }, { status: 400 });

  const app = identify(query);
  const base = request.nextUrl.origin;
  const done = (slug: string) => Response.json({ slug, cached: true, url: `${base}/plan/${slug}` });
  const stored = await getStoredPlan(app.slug);
  if (loadGuide(app.slug) || (stored && !stored.plan.meta.fallback)) return done(app.slug);
  // A short cooldown avoids repeating failed provider calls. Explicit retry can upgrade a starter.
  if (stored?.plan.meta.fallback && body.retry !== true && Date.now() - Date.parse(stored.createdAt) < 300_000) return done(app.slug);
  const fallback = async (reason: string) => {
    // An unfamiliar app can still get a toolkit link without search or model credits.
    let facts: ToolkitFacts | undefined;
    if (!resolveApp(query)) {
      try { facts = await findToolkit(app.name, AbortSignal.timeout(8_000)); } catch { /* Keep unknowns explicit. */ }
    }
    const keyOnly = facts?.toolkitExists && facts.authSchemes.includes("API_KEY") && !facts.authSchemes.some((scheme) => OAUTH_SCHEMES.includes(scheme));
    const plan = keyOnly ? notOAuthPlan(app, facts!) : starterPlan(query, reason, facts);
    const latest = await getStoredPlan(app.slug);
    if (latest && !latest.plan.meta.fallback) return done(app.slug);
    await savePlan(app.slug, { plan, sources: [], query, createdAt: new Date().toISOString() });
    return done(app.slug);
  };

  const setupIssue = generationSetupIssue();
  if (setupIssue) return Response.json({ code: "setup", message: setupIssue }, { status: 503 });

  // Someone is already generating this app: join that run instead of starting another.
  const active = await activeRunFor(app.slug);
  if (active) return Response.json({ runId: active.runId, slug: app.slug, joined: true, stream: `${base}/api/generate/${active.runId}` });

  if (await tooManyActive()) return fallback("Two full plans are being researched right now. Try full research again in a minute.");
  const remaining = await remainingQuota();
  if (remaining !== undefined && remaining < 1) return fallback("Today's free AI allowance is used up. Full research can be retried after it resets.");
  const visitor = visitorId(request.headers);
  const slot = await takeVisitorSlot(visitor);
  if (!slot.ok) {
    const retryAt = new Date(Date.now() + (slot.retryInMin ?? 60) * 60_000).toISOString().slice(0, 16).replace("T", " ");
    return fallback(`Your hourly allowance for full research is used up. Try full research after ${retryAt} UTC.`);
  }

  const run = await createRun(query, app.slug, { visitor, at: slot.at! });
  await markActive(app.slug, run.id); // claim the app now so a second request joins this run
  return Response.json({ runId: run.id, slug: app.slug, stream: `${base}/api/generate/${run.id}` });
}
