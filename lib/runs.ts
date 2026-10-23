// Live run bookkeeping: run records, dedupe of concurrent runs per app, per-visitor and global limits.
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { PipelineEvent, StoredPlan } from "@/lib/pipeline";
import { store } from "@/lib/store";

export type RunRecord = {
  id: string;
  query: string;
  slug: string;
  status: "pending" | "running" | "done" | "failed" | "cancelled";
  createdAt: number;
  heartbeat?: number;
  visitorSlot?: { visitor: string; at: number };
  error?: Extract<PipelineEvent, { type: "error" }>;
  planStatus?: StoredPlan["plan"]["meta"]["status"];
};

export const RUN_CAP_MS = 240_000; // hard cap on pipeline time (Vercel Hobby functions stop at 300s)
const VISITOR_RUNS_PER_HOUR = Number(process.env.VISITOR_RUNS_PER_HOUR) || 3;
const MAX_CONCURRENT = 2;

type ActiveIndex = Record<string, { runId: string; startedAt: number }>; // slug → active run

export const getRun = (id: string) => store.get<RunRecord>(`runs/${id}.json`);
export const saveRun = (run: RunRecord) => store.set(`runs/${run.id}.json`, run);
export const getStoredPlan = (slug: string) => store.get<StoredPlan>(`plans/${slug}.json`);
export const savePlan = (slug: string, value: StoredPlan) => store.set(`plans/${slug}.json`, value);

export async function createRun(query: string, slug: string, visitorSlot?: RunRecord["visitorSlot"]): Promise<RunRecord> {
  const run: RunRecord = { id: randomUUID(), query, slug, status: "pending", createdAt: Date.now(), visitorSlot };
  await saveRun(run);
  return run;
}

async function activeIndex(): Promise<ActiveIndex> {
  const idx = (await store.get<ActiveIndex>("active/index.json")) ?? {};
  const now = Date.now();
  for (const [slug, a] of Object.entries(idx)) if (now - a.startedAt > RUN_CAP_MS + 30_000) delete idx[slug];
  return idx;
}

/** Another live run for the same app, if one is in progress (dedupe). */
export async function activeRunFor(slug: string) {
  return (await activeIndex())[slug];
}

export async function markActive(slug: string, runId: string) {
  const idx = await activeIndex();
  idx[slug] = { runId, startedAt: Date.now() };
  await store.set("active/index.json", idx);
}

export async function clearActive(slug: string, runId: string) {
  const idx = await activeIndex();
  if (idx[slug]?.runId === runId) delete idx[slug];
  await store.set("active/index.json", idx);
}

export async function tooManyActive() {
  return Object.keys(await activeIndex()).length >= MAX_CONCURRENT;
}

export function visitorId(headers: Headers) {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
  return createHash("sha256").update(`oln:${ip}`).digest("hex").slice(0, 16);
}

/** True if the visitor may start another run; records the run when allowed. */
export async function takeVisitorSlot(visitor: string): Promise<{ ok: boolean; at?: number; retryInMin?: number }> {
  const key = `limits/${visitor}.json`;
  const hourAgo = Date.now() - 3_600_000;
  const times = ((await store.get<number[]>(key)) ?? []).filter((t) => t > hourAgo);
  if (times.length >= VISITOR_RUNS_PER_HOUR) return { ok: false, retryInMin: Math.ceil((times[0] + 3_600_000 - Date.now()) / 60_000) };
  const at = Date.now();
  times.push(at);
  await store.set(key, times);
  return { ok: true, at };
}

/** Refund failed/cancelled attempts; successful full research keeps its reservation. */
export async function releaseVisitorSlot(slot: RunRecord["visitorSlot"]) {
  if (!slot) return;
  const key = `limits/${slot.visitor}.json`;
  const times = (await store.get<number[]>(key)) ?? [];
  const index = times.indexOf(slot.at);
  if (index >= 0) times.splice(index, 1);
  await store.set(key, times);
}
