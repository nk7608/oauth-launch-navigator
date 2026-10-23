"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SearchIcon, SparklesIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SetupBadge } from "@/components/setup-badge";
import { apps, categories, resolveApp, searchApps, setupType, type SetupType } from "@/lib/apps";
import type { GuideStatus } from "@/lib/guides";

type SetupFilter = "all" | SetupType;

const SETUP_FILTERS: { value: SetupFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready to use" },
  { value: "own_app", label: "Needs your own app" },
];

const GUIDE_LABEL: Record<GuideStatus, string> = {
  reference: "Reference guide",
  verified: "Reviewed guide",
  generated: "Guide ready",
  partial: "Partial guide",
};

export function Catalog({ statuses }: { statuses: Record<string, GuideStatus> }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [setup, setSetup] = useState<SetupFilter>("all");
  const [category, setCategory] = useState("all");

  const results = useMemo(() => {
    const list = searchApps(query).filter(
      (a) => (setup === "all" || setupType(a) === setup) && (category === "all" || a.category === category),
    );
    return query.trim() ? list : [...list].sort((a, b) => Number(Boolean(statuses[b.slug])) - Number(Boolean(statuses[a.slug])));
  }, [query, setup, category, statuses]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>();
    for (const a of results) map.set(a.category, [...(map.get(a.category) ?? []), a]);
    return [...map.entries()];
  }, [results]);

  const exact = query.trim() ? resolveApp(query) : undefined;
  const generateHref = `/generate?q=${encodeURIComponent(query.trim())}`;

  function onSubmit(e: React.FormEvent) {
    if (!query.trim()) { e.preventDefault(); return; }
    if (exact) { e.preventDefault(); router.push(`/plan/${exact.slug}`); }
    // A native GET navigation starts a fresh research screen instead of restoring Activity state.
  }

  const counts = (value: SetupFilter) =>
    apps.filter((a) => (value === "all" || setupType(a) === value) && (category === "all" || a.category === category)).length;

  return (
    <div className="space-y-8">
      <form action="/generate" method="get" onSubmit={onSubmit} role="search">
        <label htmlFor="app-search" className="mb-2 block text-sm font-medium">
          Which app are you connecting?
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="app-search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or website, like Gmail or pipedrive.com"
            autoComplete="off"
            autoFocus
            className="h-12 pl-11 text-base"
          />
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <fieldset className="flex flex-wrap items-center gap-1" aria-label="Setup type">
          <legend className="sr-only">Setup type</legend>
          {SETUP_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={setup === f.value}
              onClick={() => setSetup(f.value)}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {f.label} <span className="tabular-nums opacity-70">{counts(f.value)}</span>
            </button>
          ))}
        </fieldset>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      {query.trim() && !exact && (
        <a
          href={generateHref}
          className="flex items-start gap-3 rounded-lg border border-dashed border-primary/40 bg-own-soft p-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
        >
          <SparklesIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="block font-medium">
              {results.length ? "Not the app you meant?" : "Not in the library yet."} Generate a plan for “{query.trim()}”
            </span>
            <span className="text-sm text-muted-foreground">
              An agent checks Composio and the provider&apos;s docs, then builds a sourced plan. Takes about 2 minutes.
            </span>
          </span>
        </a>
      )}

      <div className="space-y-8" aria-live="polite">
        {grouped.length === 0 && !query.trim() && <p className="text-muted-foreground">No apps match these filters.</p>}
        {grouped.map(([cat, list]) => (
          <section key={cat} aria-labelledby={`cat-${cat}`}>
            <h2 id={`cat-${cat}`} className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
              {cat} <span className="font-normal text-muted-foreground tabular-nums">{list.length}</span>
            </h2>
            <ul className="divide-y rounded-lg border bg-card">
              {list.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/plan/${a.slug}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:grid-cols-[1fr_11rem_12rem]"
                  >
                    <span className="font-medium">{a.name}</span>
                    <SetupBadge type={setupType(a)} />
                    <span className="col-span-2 text-sm text-muted-foreground sm:col-span-1 sm:text-right">
                      {statuses[a.slug] ? GUIDE_LABEL[statuses[a.slug]] : "Generated when opened"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
