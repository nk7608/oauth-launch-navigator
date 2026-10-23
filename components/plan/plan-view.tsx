"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangleIcon, ArrowLeftIcon, BotIcon, ChevronRightIcon, ExternalLinkIcon, FileTextIcon, UserIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SetupBadge } from "@/components/setup-badge";
import { CopyButton } from "@/components/plan/copy-button";
import { EvidenceChip, EvidenceList } from "@/components/plan/evidence";
import { setupType } from "@/lib/apps";
import { planToMarkdown, stepToMarkdown } from "@/lib/markdown";
import type { Plan } from "@/lib/plan-schema";
import {
  AUDIENCE_OPTIONS,
  CAPABILITY_OPTIONS,
  DEFAULT_INPUTS,
  PHASES,
  SCENARIO_LABEL,
  parseInputs,
  viewPlan,
  type Inputs,
  type PlanView as View,
  type Scenario,
} from "@/lib/rules";
import { cn } from "@/lib/utils";

const SCENARIO_TONE: Record<Scenario, string> = {
  A_ready_to_use: "bg-ok-soft text-ok",
  B_switch_to_own_app: "bg-own-soft text-own",
  C_own_app_required: "bg-own-soft text-own",
  D_review_required: "bg-wait-soft text-wait",
  E_gated_access: "bg-wait-soft text-wait",
  F_not_oauth: "bg-muted text-foreground",
  G_not_in_composio: "bg-muted text-foreground",
  H_insufficient_info: "bg-muted text-muted-foreground",
};

const STATUS_TEXT: Record<Plan["meta"]["status"], string> = {
  reference: "Researched and reviewed by hand",
  verified: "Reviewed by a person",
  generated: "Researched by an agent, not yet reviewed",
  partial: "Partly researched: some parts couldn't be verified",
};

/** Interactive plan: reads ?does=&users= from the URL so shared links reopen the same state. */
export function PlanViewLive({ plan }: { plan: Plan }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const inputs = parseInputs(params);
  const setInputs = (next: Inputs) => {
    const q = new URLSearchParams({ does: next.does, users: next.users });
    router.replace(`${pathname}?${q}`, { scroll: false });
  };
  return <PlanLayout plan={plan} inputs={inputs} onChange={setInputs} />;
}

/** Static render with default inputs (prerendered shell before the URL is read). */
export function PlanViewStatic({ plan }: { plan: Plan }) {
  return <PlanLayout plan={plan} inputs={DEFAULT_INPUTS} />;
}

function PlanLayout({ plan, inputs, onChange }: { plan: Plan; inputs: Inputs; onChange?: (i: Inputs) => void }) {
  const view = useMemo(() => viewPlan(plan, inputs), [plan, inputs]);
  const done = useDoneSteps(plan.app.slug);
  const shareUrl = () => window.location.href;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:py-10">
      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" aria-hidden /> All apps
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{plan.app.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {plan.composio.toolkitExists ? <SetupBadge type={setupType(plan.composio)} /> : <span>Not in Composio</span>}
            {plan.app.category && <span>{plan.app.category}</span>}
          </div>
        </div>

        <Choice<Inputs["does"]>
          legend="What will your agent do?"
          options={CAPABILITY_OPTIONS}
          value={inputs.does}
          onChange={onChange && ((does) => onChange({ ...inputs, does }))}
        />
        <Choice<Inputs["users"]>
          legend="Who will connect accounts?"
          options={AUDIENCE_OPTIONS}
          value={inputs.users}
          onChange={onChange && ((users) => onChange({ ...inputs, users }))}
        />

        <div className="space-y-1 border-t pt-4">
          <CopyButton value={shareUrl} label="Copy share link" done="Link copied" className="-ml-2" />
          <CopyButton
            value={() => planToMarkdown(plan, view, window.location.href)}
            label="Copy as Markdown"
            done="Plan copied as Markdown"
            className="-ml-2"
          />
          <a
            href={`/api/plan/${plan.app.slug}.json?does=${inputs.does}&users=${inputs.users}`}
            className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <FileTextIcon className="size-3.5" aria-hidden /> JSON for agents
          </a>
          <p className="pt-2 text-xs text-muted-foreground">Anyone with the link can open this plan. Plans aren&apos;t listed or indexed anywhere.</p>
        </div>
      </aside>

      <article className="min-w-0 space-y-10">
        <header className="space-y-5">
          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-sm font-medium", SCENARIO_TONE[view.scenario])}>
            {SCENARIO_LABEL[view.scenario]}
          </span>
          <p className="max-w-[62ch] text-xl leading-snug font-medium text-balance sm:text-2xl">{view.verdict}</p>
          <ul className="space-y-0.5 text-sm text-muted-foreground">
            {view.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <dl className="grid gap-4 border-y py-4 sm:grid-cols-3">
            <Fact term="Setup effort">{view.effort}</Fact>
            <Fact term="Wait">
              {view.wait.none ?? (
                <>
                  <span className="block">{view.wait.official}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Provider&apos;s own estimate</span>
                  {view.wait.reported && (
                    <span className="mt-2 block">
                      {view.wait.reported}
                      <span className="block text-xs text-muted-foreground">Reported by others</span>
                    </span>
                  )}
                </>
              )}
            </Fact>
            <Fact term="Who must approve">{view.gatekeepers.length ? view.gatekeepers.join("; ") : "No one outside your team"}</Fact>
          </dl>
        </header>

        <PhasePath view={view} />

        <section aria-labelledby="next-action" className="rounded-lg border-l-4 border-primary bg-own-soft px-5 py-4">
          <h2 id="next-action" className="text-sm font-semibold text-primary">
            Next action
          </h2>
          <p className="mt-1 text-lg">{view.nextAction}</p>
        </section>

        <section aria-labelledby="steps" className="space-y-8">
          <h2 id="steps" className="sr-only">
            Steps
          </h2>
          {view.steps.length === 0 && <p className="text-muted-foreground">No steps apply to this setup.</p>}
          {PHASES.map((phase) => {
            const steps = view.steps.filter((s) => s.phase === phase.id);
            if (!steps.length) return null;
            return (
              <div key={phase.id} id={`phase-${phase.id}`}>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{phase.label}</h3>
                <ol className="space-y-3">
                  {steps.map((s) => (
                    <StepRow key={s.id} step={s} view={view} done={done.has(s.id)} onToggle={() => done.toggle(s.id)} />
                  ))}
                </ol>
              </div>
            );
          })}
        </section>

        <div className="space-y-3">
          {view.scopes.length > 0 && (
            <Section title={`Scopes for this setup (${view.scopes.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-4 font-medium">Scope</th>
                      <th className="py-2 pr-4 font-medium">Allows</th>
                      <th className="py-2 pr-4 font-medium">Review it triggers</th>
                      <th className="py-2 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.scopes.map((s) => (
                      <tr key={s.scope} className="border-b align-top last:border-0">
                        <td className="py-3 pr-4">
                          <code className="font-mono text-xs break-all">{s.scope}</code>
                          <span className="mt-1 block text-xs text-muted-foreground capitalize">{s.tier.replace("_", " ")}</span>
                        </td>
                        <td className="py-3 pr-4">{s.allows}</td>
                        <td className="py-3 pr-4">{s.triggers}</td>
                        <td className="py-3">
                          <EvidenceChip ids={s.evidence} evidence={view.evidence} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
          <Section title={`Sources and what we couldn't verify (${view.evidence.length} sources, ${view.unknowns.length} open questions)`}>
            <p className="mb-3 text-sm text-muted-foreground">
              {STATUS_TEXT[plan.meta.status]}. Researched {plan.meta.generatedAt}
              {plan.meta.model ? ` with ${plan.meta.model}` : ""}.
            </p>
            {view.unknowns.length > 0 && (
              <>
                <h4 className="mb-2 text-sm font-semibold">What we couldn&apos;t verify</h4>
                <ul className="mb-5 list-disc space-y-1 pl-5 text-sm">
                  {view.unknowns.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </>
            )}
            <h4 className="mb-2 text-sm font-semibold">Sources</h4>
            <EvidenceList items={view.evidence} />
          </Section>
        </div>
      </article>
    </div>
  );
}

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string; hint: string }[];
  value: T;
  onChange?: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            disabled={!onChange}
            onClick={() => onChange?.(o.value)}
            className="rounded-md px-1 py-1.5 text-sm leading-tight transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-background aria-pressed:font-medium aria-pressed:shadow-xs aria-[pressed=false]:text-muted-foreground"
          >
            {o.label}
            <span className="block text-[11px] font-normal text-muted-foreground">{o.hint}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{term}</dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}

/** The route from prepare to launch; the approval leg carries the wait so it's visible at a glance. */
function PhasePath({ view }: { view: View }) {
  const review = !view.wait.none;
  return (
    <nav aria-label="Plan phases">
      <ol className="grid grid-cols-5 gap-1.5">
        {view.phases.map((p, i) => {
          const isApproval = p.id === "get_approved";
          const empty = p.count === 0;
          return (
            <li key={p.id} className="min-w-0">
              <a
                href={empty ? undefined : `#phase-${p.id}`}
                aria-disabled={empty}
                className={cn(
                  "block h-full rounded-md border-t-4 px-2 pt-2 pb-1 text-sm transition-colors",
                  empty ? "border-border text-muted-foreground/70" : "border-primary hover:bg-muted",
                  isApproval && review && "border-wait bg-wait-soft hover:bg-wait-soft/70",
                )}
              >
                <span className="block text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="block truncate font-medium sm:whitespace-normal">{p.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {empty ? (isApproval ? "Not needed" : "Nothing to do") : `${p.count} step${p.count > 1 ? "s" : ""}`}
                </span>
                {isApproval && review && <span className="mt-1 hidden text-xs text-wait sm:block">Wait: {shortWait(view.wait.official)}</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function shortWait(s?: string) {
  if (!s) return "Unknown";
  return s.length > 60 ? s.slice(0, 57).trimEnd() + "…" : s;
}

function StepRow({ step, view, done, onToggle }: { step: View["steps"][number]; view: View; done: boolean; onToggle: () => void }) {
  const owner = step.owner === "agent" ? { Icon: BotIcon, label: "Agent can do", tone: "text-ev-tested" } : { Icon: UserIcon, label: "You do", tone: "text-foreground" };
  return (
    <li id={`step-${step.number}`} className={cn("rounded-lg border bg-card p-4 sm:p-5", done && "opacity-60")}>
      <div className="flex gap-3">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          aria-label={`Mark step ${step.number} done`}
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <h4 className={cn("font-semibold", done && "line-through")}>
              <span className="mr-2 text-muted-foreground tabular-nums">{step.number}.</span>
              {step.title}
            </h4>
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1 text-xs font-medium", owner.tone)}>
                <owner.Icon className="size-3.5" aria-hidden />
                {owner.label}
              </span>
              <CopyButton value={stepToMarkdown(step)} label={`Copy step ${step.number}`} done={`Step ${step.number} copied`} iconOnly />
            </div>
          </div>
          <p className="max-w-[70ch] text-[15px] leading-relaxed">{step.detail}</p>
          {step.copyValues?.map((c) => (
            <div key={c.label} className="rounded-md border bg-muted/50">
              <div className="flex items-center justify-between border-b px-3 py-1 text-xs text-muted-foreground">
                {c.label}
                <CopyButton value={c.value} label={`Copy ${c.label}`} done={`${c.label} copied`} iconOnly />
              </div>
              <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">{c.value}</pre>
            </div>
          ))}
          {step.blocker && (
            <div className="flex gap-2 rounded-md bg-wait-soft p-3 text-sm">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-wait" aria-hidden />
              <p>
                <span className="font-medium">If you see “{step.blocker.symptom}”</span>
                <span className="text-muted-foreground"> · </span>
                {step.blocker.cause}. <span className="font-medium">Fix:</span> {step.blocker.fix}.
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-start gap-3">
            <EvidenceChip ids={step.evidence} evidence={view.evidence} />
            {step.link && (
              <a
                href={step.link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
              >
                {step.link.label}
                <ExternalLinkIcon className="size-3" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible className="rounded-lg border">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left font-medium hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring">
        <ChevronRightIcon className="size-4 transition-transform group-data-[panel-open]:rotate-90" aria-hidden />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-4 py-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/** Step checkboxes, saved in this browser only. */
function useDoneSteps(slug: string) {
  const key = `oln:done:${slug}`;
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      setIds(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      setIds([]);
    }
  }, [key]);
  return {
    has: (id: string) => ids.includes(id),
    toggle: (id: string) => {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      setIds(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage blocked: progress just isn't remembered */
      }
    },
  };
}

