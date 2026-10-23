"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { AlertTriangleIcon, ArrowLeftIcon, BotIcon, CheckIcon, ChevronRightIcon, ExternalLinkIcon, FileTextIcon, UserIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AppLogo } from "@/components/app-logo";
import { AudienceIcon, OneAppManyUsers, ScenarioExit } from "@/components/illustrations";
import { SetupBadge } from "@/components/setup-badge";
import { CodeBlock } from "@/components/plan/code-block";
import { CopyButton } from "@/components/plan/copy-button";
import { EvidenceChip, EvidenceList } from "@/components/plan/evidence";
import { CopyCode, RichText } from "@/components/plan/rich-text";
import { setupType } from "@/lib/apps";
import { planForAgent, planToMarkdown, stepToMarkdown } from "@/lib/markdown";
import type { Plan } from "@/lib/plan-schema";
import {
  AUDIENCE_OPTIONS,
  CAPABILITY_OPTIONS,
  DEFAULT_INPUTS,
  PHASES,
  REQUEST_BOARD_URL,
  SCENARIO_LABEL,
  parseInputs,
  viewPlan,
  type Inputs,
  type PlanScope,
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
  reference: "Reference guide; owner review pending",
  verified: "Reviewed by a person",
  generated: "Researched by an agent, not yet reviewed",
  partial: "Partly researched: some parts couldn't be verified",
};

const TIER_TONE: Record<PlanScope["tier"], string> = {
  basic: "bg-muted text-foreground",
  none: "bg-muted text-foreground",
  unknown: "bg-muted text-muted-foreground",
  sensitive: "bg-wait-soft text-wait",
  provider_review: "bg-wait-soft text-wait",
  restricted: "bg-blocker-soft text-blocker",
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
  // Toggle hint: does choosing "Customers" put this plan into a review path?
  const customersReview = useMemo(() => {
    const s = viewPlan(plan, { ...inputs, users: "customers" }).scenario;
    return s === "D_review_required" || s === "E_gated_access";
  }, [plan, inputs]);
  const done = useDoneSteps(plan.app.slug);
  const current = view.steps.find((s) => !done.has(s.id))?.id;
  const shareUrl = () => window.location.href;
  const exit =
    view.scenario === "F_not_oauth" ? "not_oauth" : view.scenario === "G_not_in_composio" ? "not_in_composio" : view.scenario === "H_insufficient_info" ? "insufficient" : undefined;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 lg:py-10">
      <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" aria-hidden /> All apps
        </Link>
        <div className="flex items-center gap-3">
          <AppLogo slug={plan.composio.toolkitSlug ?? plan.app.slug} name={plan.app.name} />
          <div>
            <h1 className="text-[30px] leading-tight font-semibold tracking-tight">{plan.app.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {plan.meta.fallback && !plan.meta.fallback.composioChecked ? <span>Composio support unknown</span> : plan.composio.toolkitExists ? <SetupBadge type={setupType(plan.composio)} /> : <span>Not in Composio</span>}
              {plan.app.category && <span>{plan.app.category}</span>}
            </div>
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
          icon={(v) => <AudienceIcon kind={v} />}
          badge={(v) => (v === "customers" && customersReview ? "review needed" : undefined)}
        />

        <div className="space-y-1 border-t pt-4">
          <CopyButton
            value={() => planForAgent(plan, view, window.location.href)}
            label="Copy for your AI agent"
            done="Plan copied for your agent"
            className="-ml-2 font-medium text-primary"
          />
          <CopyButton value={shareUrl} label="Copy share link" done="Link copied" className="-ml-2" />
          <CopyButton value={() => planToMarkdown(plan, view, window.location.href)} label="Copy as Markdown" done="Plan copied as Markdown" className="-ml-2" />
          <a
            href={`/api/plan/${plan.app.slug}.json?does=${inputs.does}&users=${inputs.users}`}
            className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <FileTextIcon className="size-3.5" aria-hidden /> JSON for agents
          </a>
          <p className="pt-2 text-xs text-muted-foreground">Anyone with the link can open this plan. Live plans are unlisted but public.</p>
        </div>
      </aside>

      <article className="min-w-0 space-y-8">
        {plan.meta.fallback && <StarterNotice plan={plan} />}

        <header className="space-y-5">
          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-sm font-medium", SCENARIO_TONE[view.scenario])}>{SCENARIO_LABEL[view.scenario]}</span>
          <p className="max-w-[60ch] text-[22px] leading-snug font-medium text-balance">{view.verdict}</p>
          <ul className="space-y-0.5 text-sm text-muted-foreground">
            {view.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <dl className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3">
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
            <Fact term="Who must approve">{view.gatekeepers.length ? view.gatekeepers.join("; ") : view.scenario === "H_insufficient_info" ? "Unknown" : "No one outside your team"}</Fact>
          </dl>
        </header>

        {exit && <ScenarioExit kind={exit} />}

        {view.scenario === "H_insufficient_info" ? (
          <section aria-labelledby="checked" className="rounded-xl border bg-card p-5">
            <h2 id="checked" className="font-semibold">What we checked</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
              {view.unknowns.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            {!plan.composio.toolkitExists && (
              <p className="mt-3 text-sm text-muted-foreground">
                If this app is real and Composio doesn&apos;t support it yet, you can{" "}
                <a href={REQUEST_BOARD_URL} target="_blank" rel="noreferrer" className="text-primary underline">request it from Composio</a>.
              </p>
            )}
          </section>
        ) : (
          <ApprovalStrip plan={plan} view={view} isDone={done.has} />
        )}

        {view.steps.length > 0 && (
          <section aria-labelledby="next-action" className="rounded-xl border-l-4 border-primary bg-own-soft px-5 py-4">
            <h2 id="next-action" className="text-sm font-semibold text-primary">Next action</h2>
            <p className="mt-1 text-lg">{view.nextAction}</p>
          </section>
        )}

        <section aria-labelledby="steps" className="space-y-8">
          <h2 id="steps" className="sr-only">Steps</h2>
          {view.steps.length === 0 && view.scenario !== "H_insufficient_info" && <p className="text-muted-foreground">No steps apply to this setup.</p>}
          {PHASES.map((phase) => {
            const steps = view.steps.filter((s) => s.phase === phase.id);
            if (!steps.length) return null;
            return (
              <div key={phase.id} id={`phase-${phase.id}`} className="scroll-mt-6">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{phase.label}</h3>
                {phase.id === "connect_composio" &&
                  !plan.meta.fallback &&
                  plan.composio.toolkitExists &&
                  view.scenario !== "A_ready_to_use" &&
                  plan.composio.authSchemes.some((scheme) => scheme === "OAUTH2" || scheme === "OAUTH1") && (
                    <Collapsible className="mb-4 rounded-xl border bg-card">
                      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring">
                        <ChevronRightIcon className="size-4 transition-transform group-data-[panel-open]:rotate-90 motion-reduce:transition-none" aria-hidden />
                        How it fits: one OAuth app, many users
                      </CollapsibleTrigger>
                      <CollapsibleContent className="border-t p-3">
                        <OneAppManyUsers />
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                <ol className="relative">
                  {steps.map((s, i) => (
                    <StepRow key={s.id} step={s} view={view} done={done.has(s.id)} current={s.id === current} last={i === steps.length - 1} onToggle={() => done.toggle(s.id)} />
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
                          <CopyCode value={s.scope} />
                          <span className={cn("mt-1.5 block w-fit rounded-full px-2 py-0.5 text-xs font-medium capitalize", TIER_TONE[s.tier])}>{s.tier.replace("_", " ")}</span>
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

function StarterNotice({ plan }: { plan: Plan }) {
  const prompt = `Research the OAuth launch plan for "${plan.app.website ?? plan.app.name}" for an AI agent that connects through Composio. Follow the oauth-guide-research skill from https://github.com/nk7608/oauth-launch-navigator/blob/main/.claude/skills/oauth-guide-research/SKILL.md and return JSON matching lib/plan-schema.ts. Cite only official provider or Composio docs; mark anything unsupported as Unknown.`;
  return (
    <section className="rounded-xl border border-waiting/50 bg-wait-soft p-4 text-sm" aria-label="Starter plan">
      <h2 className="font-semibold">Starter plan: full research incomplete</h2>
      <p className="mt-2">{plan.meta.fallback!.reason}</p>
      <p className="mt-2 text-muted-foreground">Only available facts and source links are included. Scopes and approval requirements remain unknown.</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {plan.evidence[0]?.url && (
          <a href={plan.evidence[0].url} target="_blank" rel="noreferrer" className="text-primary underline">
            Open available source ↗
          </a>
        )}
        <a href={`/generate?q=${encodeURIComponent(plan.app.website ?? plan.app.name)}&retry=1`} className="text-primary underline">
          Retry full research later
        </a>
        <CopyButton value={prompt} label="Research it with your own AI agent" done="Research prompt copied" className="-ml-2 text-primary" />
      </div>
    </section>
  );
}

type StampState = "todo" | "waiting" | "done" | "skip";

/** The approval path for this plan (#3): Registered → Provider review → Customer admin → Live, from plan data. */
function ApprovalStrip({ plan, view, isDone }: { plan: Plan; view: View; isDone: (id: string) => boolean }) {
  const phaseDone = (phase: string) => {
    const s = view.steps.filter((x) => x.phase === phase);
    return s.length > 0 && s.every((x) => isDone(x.id));
  };
  const ownApp = !["A_ready_to_use", "F_not_oauth"].includes(view.scenario);
  const review = !view.wait.none;
  const admin = view.inputs.users === "customers" && view.gatekeepers.some((g) => /admin|owner/i.test(g));
  const allDone = view.steps.length > 0 && view.steps.every((s) => isDone(s.id));
  const stamps: { label: string; note: string; state: StampState; href?: string }[] = [
    {
      label: "Register your app",
      note: ownApp ? "your OAuth app" : view.scenario === "F_not_oauth" ? "API key instead" : "use Composio's app",
      state: !ownApp ? "skip" : phaseDone("register") ? "done" : "todo",
      href: "#phase-register",
    },
    {
      label: "Provider review",
      note: review ? shortWait(view.wait.official) : "not needed",
      state: !review ? "skip" : phaseDone("get_approved") ? "done" : "waiting",
      href: "#phase-get_approved",
    },
    { label: "Customer admin", note: admin ? "may need to approve" : "not needed", state: admin ? "waiting" : "skip" },
    { label: "Live", note: allDone ? "all steps done" : `${view.steps.length} steps`, state: allDone ? "done" : "todo", href: "#steps" },
  ];
  if (plan.meta.fallback) return null;
  const tone: Record<StampState, string> = {
    todo: "border-primary/40 bg-card text-foreground",
    waiting: "border-waiting bg-wait-soft text-wait",
    done: "border-done bg-ok-soft text-ok",
    skip: "border-dashed border-border bg-transparent text-muted-foreground",
  };
  return (
    <nav aria-label="Approval path">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stamps.map((s, i) => {
          const body = (
            <>
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums",
                    s.state === "done" ? "border-done bg-done text-white" : "border-current",
                  )}
                  aria-hidden
                >
                  {s.state === "done" ? <CheckIcon className="size-3" /> : i + 1}
                </span>
                {s.label}
              </span>
              <span className="mt-1 block text-xs">{s.note}</span>
              <span className="sr-only">{{ todo: "to do", waiting: "needs someone's approval", done: "done", skip: "not needed" }[s.state]}</span>
            </>
          );
          return (
            <li key={s.label}>
              {s.href && s.state !== "skip" ? (
                <a href={s.href} className={cn("block h-full rounded-xl border-2 px-3 py-2.5 transition-colors hover:brightness-[0.98]", tone[s.state])}>
                  {body}
                </a>
              ) : (
                <div className={cn("h-full rounded-xl border-2 px-3 py-2.5", tone[s.state])}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
  icon,
  badge,
}: {
  legend: string;
  options: { value: T; label: string; hint: string }[];
  value: T;
  onChange?: (v: T) => void;
  icon?: (v: T) => React.ReactNode;
  badge?: (v: T) => string | undefined;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {options.map((o) => {
          const b = badge?.(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={value === o.value}
              disabled={!onChange}
              onClick={() => onChange?.(o.value)}
              className="flex flex-col items-center rounded-lg px-1 py-1.5 text-sm leading-tight transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-card aria-pressed:font-medium aria-pressed:shadow-xs aria-[pressed=false]:text-muted-foreground motion-reduce:transition-none"
            >
              {icon?.(o.value)}
              {o.label}
              <span className="block text-[11px] font-normal text-muted-foreground">{o.hint}</span>
              {b && <span className="mt-1 rounded-full bg-wait-soft px-1.5 text-[10px] font-medium whitespace-nowrap text-wait">{b}</span>}
            </button>
          );
        })}
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

function shortWait(s?: string) {
  if (!s) return "Unknown";
  return s.length > 48 ? s.slice(0, 45).trimEnd() + "…" : s;
}

function StepRow({
  step,
  view,
  done,
  current,
  last,
  onToggle,
}: {
  step: View["steps"][number];
  view: View;
  done: boolean;
  current: boolean;
  last: boolean;
  onToggle: () => void;
}) {
  const owner =
    step.owner === "agent"
      ? { Icon: BotIcon, label: "Agent can do", tone: "bg-own-soft text-own" }
      : { Icon: UserIcon, label: "You do", tone: "bg-muted text-foreground" };
  const hasCopies = Boolean(step.copyValues?.length);
  return (
    <li id={`step-${step.number}`} className="relative flex scroll-mt-6 gap-3 pb-4 sm:gap-4">
      {/* Timeline rail */}
      {!last && <span aria-hidden className="absolute top-9 bottom-0 left-[15px] w-px bg-border" />}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Step ${step.number} done. Mark as not done` : `Mark step ${step.number} done`}
        className={cn(
          "relative z-10 mt-3 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
          done ? "border-done bg-done text-white" : current ? "border-primary bg-card text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/60",
        )}
      >
        {done ? <CheckIcon className="size-4" aria-hidden /> : step.number}
      </button>
      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border bg-card p-4 sm:p-5",
          current && !done && "border-primary/60 ring-4 ring-primary/10",
          done && "bg-card/60",
        )}
      >
        {current && !done && <p className="mb-2 text-xs font-semibold text-primary">You are here</p>}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h4 className={cn("font-semibold text-[17px] leading-snug", done && "text-muted-foreground line-through")}>{step.title}</h4>
          <div className="flex items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", owner.tone)}>
              <owner.Icon className="size-3.5" aria-hidden />
              {owner.label}
            </span>
            <CopyButton value={stepToMarkdown(step)} label={`Copy step ${step.number}`} done={`Step ${step.number} copied`} iconOnly />
          </div>
        </div>
        <div className={cn("mt-3 gap-4", hasCopies && "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]")}>
          <div className="min-w-0 space-y-3">
            <RichText text={step.detail} className="max-w-[72ch] text-[15px] leading-relaxed" />
            {step.blocker && (
              <details className="group rounded-r-lg border-l-4 border-blocker bg-blocker-soft/60 text-sm">
                <summary className="flex cursor-pointer list-none items-start gap-2 p-3 font-medium focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-blocker" aria-hidden />
                  <span className="min-w-0 flex-1">
                    If you see: <span className="font-normal">&ldquo;{step.blocker.symptom.replace(/^["“]|["”]$/g, "")}&rdquo;</span>
                  </span>
                  <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
                </summary>
                <dl className="space-y-1.5 px-3 pb-3 pl-9">
                  <div>
                    <dt className="inline font-medium">Why: </dt>
                    <dd className="inline">{step.blocker.cause}.</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Fix: </dt>
                    <dd className="inline">{step.blocker.fix}.</dd>
                  </div>
                </dl>
              </details>
            )}
          </div>
          {hasCopies && (
            <div className="mt-3 min-w-0 space-y-2 lg:mt-0">
              {step.copyValues!.map((c) => (
                <CodeBlock key={c.label} label={c.label} value={c.value} />
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <EvidenceChip ids={step.evidence} evidence={view.evidence} />
          {step.link && (
            <a href={step.link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline">
              {step.link.label}
              <ExternalLinkIcon className="size-3" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible className="rounded-xl border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left font-medium hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring">
        <ChevronRightIcon className="size-4 transition-transform group-data-[panel-open]:rotate-90 motion-reduce:transition-none" aria-hidden />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-4 py-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

// Step checkboxes, saved in this browser only (falls back to memory when storage is blocked).
const doneListeners = new Set<() => void>();
const memoryDone = new Map<string, string>();

function readDone(key: string) {
  try {
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return memoryDone.get(key) ?? "[]";
  }
}

function subscribeDone(cb: () => void) {
  doneListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    doneListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function useDoneSteps(slug: string) {
  const key = `oln:done:${slug}`;
  const raw = useSyncExternalStore(subscribeDone, () => readDone(key), () => "[]");
  const ids = useMemo<string[]>(() => {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, [raw]);
  return {
    has: (id: string) => ids.includes(id),
    toggle: (id: string) => {
      const next = JSON.stringify(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
      try {
        localStorage.setItem(key, next);
      } catch {
        memoryDone.set(key, next);
      }
      doneListeners.forEach((l) => l());
    },
  };
}
