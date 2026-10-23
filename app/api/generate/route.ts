// POST /api/generate {query} → { runId } to stream from /api/generate/<runId>, or { slug, cached } when a plan exists.
import type { NextRequest } from "next/server";
import { loadGuide } from "@/lib/guides";
import { remainingQuota } from "@/lib/llm";
import { identify } from "@/lib/pipeline";
import { activeRunFor, createRun, getStoredPlan, markActive, takeVisitorSlot, tooManyActive, visitorId } from "@/lib/runs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 200) : "";
  if (!query) return Response.json({ code: "bad_request", message: "Send { query: \"app name or website\" }." }, { status: 400 });

  const app = identify(query);
  const base = request.nextUrl.origin;
  const done = (slug: string) => Response.json({ slug, cached: true, url: `${base}/plan/${slug}` });
  if (loadGuide(app.slug) || (await getStoredPlan(app.slug))) return done(app.slug);

  // Someone is already generating this app: join that run instead of starting another.
  const active = await activeRunFor(app.slug);
  if (active) return Response.json({ runId: active.runId, slug: app.slug, joined: true, stream: `${base}/api/generate/${active.runId}` });

  const slot = await takeVisitorSlot(visitorId(request.headers));
  if (!slot.ok) {
    return Response.json(
      { code: "limit", message: `You've hit the limit of live plans for this hour. Try again in about ${slot.retryInMin} minutes, or open a library plan.` },
      { status: 429 },
    );
  }
  if (await tooManyActive()) {
    return Response.json({ code: "busy", message: "Two plans are being generated right now. Try again in a minute." }, { status: 429 });
  }
  const remaining = await remainingQuota();
  if (remaining !== undefined && remaining < 1) {
    return Response.json(
      { code: "quota", message: "Today's free AI quota for live plans is used up. Library plans still work, and the quota resets daily." },
      { status: 503 },
    );
  }

  const run = await createRun(query, app.slug);
  await markActive(app.slug, run.id); // claim the app now so a second request joins this run
  return Response.json({ runId: run.id, slug: app.slug, stream: `${base}/api/generate/${run.id}` });
}
