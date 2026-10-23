// GET /api/generate/<runId> → Server-Sent Events: stage progress, then "done" with the plan slug (or "error").
// The run executes inside this request, so closing the stream cancels it.
import type { NextRequest } from "next/server";
import { QuotaError } from "@/lib/llm";
import { runPipeline, type PipelineEvent } from "@/lib/pipeline";
import { RUN_CAP_MS, activeRunFor, clearActive, getRun, markActive, releaseVisitorSlot, saveRun, savePlan } from "@/lib/runs";

export const maxDuration = 300;

export async function GET(request: NextRequest, ctx: RouteContext<"/api/generate/[runId]">) {
  const { runId } = await ctx.params;
  const run = await getRun(runId);
  if (!run) return Response.json({ code: "not_found", message: "No such run." }, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (e: PipelineEvent | { type: "info"; message: string }) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
        } catch {
          closed = true;
        }
      };
      const close = () => {
        if (!closed) controller.close();
        closed = true;
      };
      const ping = setInterval(() => send({ type: "info", message: "working" }), 15_000);

      try {
        if (run.status === "done") return send({ type: "done", slug: run.slug, status: run.planStatus ?? "generated" });
        if (run.status === "failed" || run.status === "cancelled") return send(run.error ?? { type: "error", code: "cancelled", message: "This run has stopped. Start a new attempt." });

        // Another stream already owns this app's run (second tab, refresh, or joined run): wait for it.
        const active = await activeRunFor(run.slug);
        const otherOwner = active && active.runId !== run.id;
        if (otherOwner || run.status === "running") {
          const ownerId = active?.runId ?? run.id;
          send({ type: "info", message: "Another request for this app is already running; showing its result when ready." });
          const until = Date.now() + RUN_CAP_MS + 30_000;
          while (Date.now() < until && !request.signal.aborted) {
            const owner = await getRun(ownerId);
            if (owner?.status === "done") return send({ type: "done", slug: owner.slug, status: owner.planStatus ?? "generated" });
            if (owner?.status === "failed" || owner?.status === "cancelled") {
              return send(owner.error ?? { type: "error", code: "failed", message: "The other run stopped. Try again." });
            }
            await new Promise((r) => setTimeout(r, 3000));
          }
          return send({ type: "error", code: "failed", message: "Timed out waiting for the other run." });
        }

        await markActive(run.slug, run.id);
        await saveRun({ ...run, status: "running", heartbeat: Date.now() });
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(RUN_CAP_MS)]);
        try {
          const { plan, sources } = await runPipeline(run.query, send, signal);
          await savePlan(run.slug, {
            plan,
            sources: sources.map(({ id, url, title }) => ({ id, url, title })),
            query: run.query,
            createdAt: new Date().toISOString(),
          });
          if (plan.meta.fallback) await releaseVisitorSlot(run.visitorSlot);
          await saveRun({ ...run, status: "done", planStatus: plan.meta.status });
          send({ type: "done", slug: run.slug, status: plan.meta.status });
        } catch (err) {
          const error: Extract<PipelineEvent, { type: "error" }> =
            err instanceof QuotaError
              ? { type: "error", code: "quota", message: "Today's free AI quota for live plans is used up. Library plans still work, and the quota resets daily." }
              : request.signal.aborted
                ? { type: "error", code: "cancelled", message: "Cancelled." }
                : signal.aborted
                  ? { type: "error", code: "failed", message: "Research took longer than 4 minutes and was stopped. Try again later." }
                  : { type: "error", code: "failed", message: err instanceof Error ? err.message : "Something went wrong." };
          await releaseVisitorSlot(run.visitorSlot);
          await saveRun({ ...run, status: error.code === "cancelled" ? "cancelled" : "failed", error });
          send(error);
        } finally {
          await clearActive(run.slug, run.id);
        }
      } finally {
        clearInterval(ping);
        close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" },
  });
}
