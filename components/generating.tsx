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
  const query = useSearchParams().get("q")?.trim() ?? "";
  const router = useRouter();
  const [stages, setStages] = useState<Record<StageId, StageState>>(() =>
    Object.fromEntries(STAGES.map((s) => [s.id, { status: "pending" }])) as Record<StageId, StageState>,
  );
  const [problem, setProblem] = useState<Problem | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
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
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
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
    })();
  }, [query, router]);

  useEffect(() => () => sourceRef.current?.close(), []);

  function cancel() {
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

      <ol className="mt-8 space-y-4" aria-live="polite">
        {STAGES.map((s) => {
          const st = stages[s.id];
          return (
            <li key={s.id} className="flex gap-3">
              <StageIcon status={problem && st.status === "running" ? "failed" : st.status} />
              <div className="min-w-0">
                <p className={cn("font-medium", st.status === "pending" && "text-muted-foreground")}>{s.label}</p>
                {st.detail && <p className="text-sm text-muted-foreground">{st.detail}</p>}
                {st.items && (
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {st.items.slice(0, 12).map((i) => (
                      <li key={i} className="truncate">
                        {i}
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
  const base = "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full";
  if (status === "running") return <LoaderIcon className="mt-0.5 size-5 shrink-0 animate-spin text-primary" aria-label="In progress" />;
  if (status === "done") return <span className={cn(base, "bg-ok text-background")} aria-label="Done"><CheckIcon className="size-3.5" /></span>;
  if (status === "skipped") return <span className={cn(base, "bg-muted text-muted-foreground")} aria-label="Skipped"><MinusIcon className="size-3.5" /></span>;
  if (status === "failed") return <span className={cn(base, "bg-destructive text-background")} aria-label="Stopped"><XIcon className="size-3.5" /></span>;
  return <CircleIcon className="mt-0.5 size-5 shrink-0 text-border" aria-label="Waiting" />;
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← All apps
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <div className="mt-3">{children}</div>
    </div>
  );
}
