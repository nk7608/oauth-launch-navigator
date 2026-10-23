"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, CircleIcon, LoaderIcon, MinusIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StageId = "identify" | "composio" | "search" | "build" | "check";
type StageState = { status: "pending" | "running" | "done" | "skipped" | "failed"; detail?: string; items?: string[] };

const STAGES: { id: StageId; label: string }[] = [
  { id: "identify", label: "Identify app" },
  { id: "composio", label: "Check Composio" },
  { id: "search", label: "Search provider docs" },
  { id: "build", label: "Build plan" },
  { id: "check", label: "Check sources" },
];

const LIBRARY_EXAMPLES = [
  { slug: "gmail", name: "Gmail" },
  { slug: "github", name: "GitHub" },
  { slug: "slack", name: "Slack" },
  { slug: "pipedrive", name: "Pipedrive" },
];

type Problem = { code: string; message: string };

export function Generating() {
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const retry = params.get("retry") === "1";
  const router = useRouter();
  const [stages, setStages] = useState<Record<StageId, StageState>>(() =>
    Object.fromEntries(STAGES.map((s) => [s.id, { status: s.id === "identify" ? "running" : "pending" }])) as Record<StageId, StageState>,
  );
  const [problem, setProblem] = useState<Problem | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const startController = useRef<AbortController | null>(null);
  const cancelled = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    if (finished || problem) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [finished, problem]);

  useEffect(() => {
    if (!query || started.current) return;
    started.current = true;
    (async () => {
      const controller = new AbortController();
      startController.current = controller;
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, retry }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]) });
      if (cancelled.current) return;
      const data = await res.json().catch(() => ({ code: "failed", message: "Couldn't start the run." }));
      if (data.cached) {
        router.replace(`/plan/${data.slug}`);
        return;
      }
      if (!res.ok || !data.runId) {
        setProblem({ code: data.code ?? "failed", message: data.message ?? "Couldn't start the run." });
        return;
      }
      const es = new EventSource(`/api/generate/${data.runId}`);
      sourceRef.current = es;
      es.addEventListener("stage", (ev) => {
        const e = JSON.parse((ev as MessageEvent).data);
        setStages((s) => ({ ...s, [e.stage]: { status: e.status, detail: e.detail ?? s[e.stage as StageId].detail, items: e.items ?? s[e.stage as StageId].items } }));
      });
      es.addEventListener("info", (ev) => {
        const e = JSON.parse((ev as MessageEvent).data);
        if (e.message !== "working") setNote(e.message);
      });
      es.addEventListener("done", (ev) => {
        const e = JSON.parse((ev as MessageEvent).data);
        es.close();
        setFinished(true);
        router.replace(`/plan/${e.slug}`);
      });
      es.addEventListener("error", (ev) => {
        const data = (ev as MessageEvent).data;
        es.close();
        setProblem(data ? JSON.parse(data) : { code: "failed", message: "The connection dropped. Try again." });
      });
    })().catch((error) => {
      if (cancelled.current) return;
      setProblem({ code: "failed", message: error?.name === "TimeoutError" ? "Starting research took too long. Try again; an existing run will be reused." : "Could not reach the server. Check your connection and try again." });
    });
  }, [query, retry, router]);

  useEffect(() => () => sourceRef.current?.close(), []);

  function cancel() {
    cancelled.current = true;
    startController.current?.abort();
    sourceRef.current?.close();
    setProblem({ code: "cancelled", message: "Cancelled. Nothing was saved." });
  }

  if (!query) {
    return (
      <Shell title="Generate a plan">
        <p className="text-muted-foreground">
          Type an app name or website on the <Link href="/" className="text-primary underline">home page</Link> to start.
        </p>
      </Shell>
    );
  }

  const elapsed = Math.floor((now - startedAt) / 1000);
  return (
    <Shell title={`Researching ${query}`}>
      <p className="text-muted-foreground">
        An agent is checking Composio and {query}&apos;s developer docs to build a sourced plan. This usually takes 1–2 minutes on free models.
      </p>

      <ol className="mt-8 grid gap-4 sm:grid-cols-5 sm:gap-2" aria-live="polite">
        {STAGES.map((s, i) => {
          const st = stages[s.id];
          const status = problem && st.status === "running" ? "failed" : st.status;
          return (
            <li key={s.id} className="relative flex gap-3 sm:flex-col sm:gap-2">
              {/* connector to the next stage on wide screens */}
              {i < STAGES.length - 1 && (
                <span aria-hidden className={cn("absolute top-2.5 left-7 hidden h-0.5 w-[calc(100%-1.5rem)] sm:block", st.status === "done" || st.status === "skipped" ? "bg-done" : "bg-border")} />
              )}
              <StageIcon status={status} />
              <div className="min-w-0">
                <p className={cn("text-sm font-medium", st.status === "pending" && "text-muted-foreground")}>{s.label}</p>
                {st.detail && <p className="mt-0.5 text-xs text-muted-foreground">{st.detail}</p>}
                {st.items && (
                  <ul className="mt-2 flex flex-wrap gap-1" aria-label="Sources found">
                    {st.items.slice(0, 10).map((d) => (
                      <li key={d} className="max-w-full truncate rounded-full border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {note && !problem && <p className="mt-6 text-sm text-muted-foreground">{note}</p>}

      {!problem ? (
        <div className="mt-8 flex items-center gap-4">
          <span className="text-sm text-muted-foreground tabular-nums" aria-label={`${elapsed} seconds elapsed`}>
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed
          </span>
          <button type="button" onClick={cancel} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
            Cancel
          </button>
        </div>
      ) : (
        <ProblemCard problem={problem} query={query} />
      )}
    </Shell>
  );
}

function ProblemCard({ problem, query }: { problem: Problem; query: string }) {
  const tone = problem.code === "failed" ? "border-destructive/40" : "border-wait/40 bg-wait-soft";
  return (
    <div className={cn("mt-8 rounded-lg border p-5", tone)} role="status">
      <p className="font-medium">{problem.message}</p>
      <p className="mt-3 text-sm text-muted-foreground">These plans are ready now:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {LIBRARY_EXAMPLES.map((a) => (
          <Link key={a.slug} href={`/plan/${a.slug}`} className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted">
            {a.name}
          </Link>
        ))}
      </div>
      {(problem.code === "cancelled" || problem.code === "failed" || problem.code === "busy") && (
        <a href={`/generate?q=${encodeURIComponent(query)}`} className="mt-4 inline-block text-sm text-primary underline">
          Start again
        </a>
      )}
    </div>
  );
}

function StageIcon({ status }: { status: StageState["status"] }) {
  const base = "relative z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full";
  if (status === "running") return <span className="relative z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-background"><LoaderIcon className="size-5 animate-spin text-primary motion-reduce:animate-none" aria-label="In progress" /></span>;
  if (status === "done") return <span className={cn(base, "bg-done text-white")} aria-label="Done"><CheckIcon className="size-3.5" /></span>;
  if (status === "skipped") return <span className={cn(base, "bg-muted text-muted-foreground")} aria-label="Skipped"><MinusIcon className="size-3.5" /></span>;
  if (status === "failed") return <span className={cn(base, "bg-destructive text-background")} aria-label="Stopped"><XIcon className="size-3.5" /></span>;
  return <span className="relative z-10 mt-0.5 flex size-5 shrink-0 rounded-full bg-background"><CircleIcon className="size-5 text-border" aria-label="Waiting" /></span>;
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← All apps
      </Link>
      <h1 className="mt-4 text-[30px] leading-tight font-semibold tracking-tight">{title}</h1>
      <div className="mt-3">{children}</div>
    </div>
  );
}
