import type { Metadata } from "next";
import Link from "next/link";
import production from "@/data/verification.json";
import { getApp } from "@/lib/apps";
import { librarySlugs, loadGuide } from "@/lib/guides";
import { validatePlan } from "@/lib/validate";

export const metadata: Metadata = {
  title: "Verification and evidence | OAuth Launch Navigator",
  description: "What we tested, what the documentation supports, and what still needs review.",
};

const STATUS = {
  reference: "Reference · awaiting owner review",
  verified: "Reviewed",
  generated: "Researched · awaiting review",
  partial: "Partial · gaps remain",
};

const CHECKS = [
  "The record matches the Zod plan schema.",
  "Steps and scopes cite at least one existing evidence ID; access references exist and evidence IDs are unique.",
  "Official, Reported and Tested evidence has a source URL.",
  "Numeric review waits have duration evidence; reported waits have Reported duration evidence.",
  "Composio authentication schemes and managed-app availability match the synced catalog when the app is listed.",
  "All nine stored input combinations agree with the rules engine, and applicable known-fact assertions pass.",
  "Live-plan evidence URLs belong to the retrieved source set or built-in Composio sources.",
];

export default function VerificationPage() {
  const guides = librarySlugs().sort().map((slug) => {
    const plan = loadGuide(slug)!;
    const app = getApp(slug);
    const result = validatePlan(plan, {
      composio: app ? { toolkitExists: true, authSchemes: app.authSchemes, managedAppAvailable: app.managedAppAvailable } : undefined,
    });
    return { plan, result };
  });
  const tests = guides.flatMap(({ plan }) =>
    plan.evidence.filter((e) => e.label === "tested").map((e) => ({ ...e, app: plan.app })),
  );
  const sourcedOnly = guides.filter(({ plan }) => !plan.evidence.some((e) => e.label === "tested"));
  const passing = guides.filter(({ result }) => result.ok).length;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">← App catalog</Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">What we verified</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          A working connection, a documented requirement, and an educated guess have different kinds of evidence.
          Each plan keeps those labels visible.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [`${guides.length}`, "library guides"],
            [`${tests.length}`, "recorded test findings"],
            [`${passing}/${guides.length}`, "pass record validation"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-lg border bg-card p-4">
              <p className="font-mono text-2xl font-medium">{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </header>

      <section aria-labelledby="production-title" className="rounded-lg border bg-card p-5">
        <h2 id="production-title" className="text-xl font-semibold">Production checks</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Recorded <time dateTime={production.checkedAt}>{production.checkedAt}</time> on the{" "}
          <a href={production.url} className="text-primary underline underline-offset-4">public deployment</a>.
          All {production.guideInputChecks} guide/input checks passed. Search, Gmail toggles, copying,
          shared links, agent exports and private storage were checked. The walkthrough including live
          research took {Math.floor(production.demoSeconds / 60)} minutes {production.demoSeconds % 60} seconds.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Live generation tests on production</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-2 pr-3 font-medium">App</th>
                <th scope="col" className="py-2 pr-3 font-medium">Result</th>
                <th scope="col" className="py-2 font-medium">Elapsed</th>
              </tr>
            </thead>
            <tbody>
              {production.liveRuns.map((run) => (
                <tr key={run.slug} className="border-b last:border-0">
                  <th scope="row" className="py-3 pr-3 font-medium">
                    <Link href={`/plan/${run.slug}`} className="text-primary hover:underline">{run.query}</Link>
                  </th>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {run.scenario === "F_not_oauth" ? "API key; no AI call" : run.scenario === "H_insufficient_info" ? "Insufficient information; no steps invented" : "Sourced plan generated"}
                    <span className="block text-xs">Saved and retrieved from private storage</span>
                  </td>
                  <td className="py-3 font-mono tabular-nums">{(run.elapsedMs / 1000).toFixed(1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {production.notes.map((note) => <p key={note} className="mt-3 text-sm text-muted-foreground">{note}</p>)}
      </section>

      <section aria-labelledby="tested-title">
        <h2 id="tested-title" className="text-xl font-semibold">Tested in real accounts</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These are the dated observations recorded during the setup attempts. They describe those accounts and conditions;
          they do not certify every scope, tenant or production setup.
        </p>
        <ul className="mt-4 space-y-3">
          {tests.map((e) => (
            <li key={`${e.app.slug}-${e.id}`} className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/plan/${e.app.slug}`} className="font-semibold text-primary hover:underline">{e.app.name}</Link>
                <time dateTime={e.checkedAt} className="text-sm text-muted-foreground">{e.checkedAt}</time>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{e.claim}</p>
              {e.note && <p className="mt-2 text-sm text-muted-foreground">{e.note}</p>}
              {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-primary underline underline-offset-4">{e.sourceTitle} ↗</a>}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="guides-title">
        <h2 id="guides-title" className="text-xl font-semibold">Guide status and remaining questions</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {sourcedOnly.map(({ plan }) => plan.app.name).join(", ")} have sourced guides with no recorded setup test.
          Only an owner-reviewed guide is marked Verified. Live research remains unreviewed unless explicitly reviewed later.
        </p>
        <ul className="mt-4 divide-y rounded-lg border">
          {guides.map(({ plan, result }) => (
            <li key={plan.app.slug} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/plan/${plan.app.slug}`} className="font-medium text-primary hover:underline">{plan.app.name}</Link>
                <span className="text-sm text-muted-foreground">{STATUS[plan.meta.status]}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Updated <time dateTime={plan.meta.generatedAt}>{plan.meta.generatedAt}</time> · Validation {result.ok ? "passed" : "failed"}
                {result.warnings.length ? ` · ${result.warnings.length} warning(s)` : ""}
              </p>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-ring">What remains unverified ({plan.unknowns.length})</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  {plan.unknowns.map((item) => <li key={item}>{item}</li>)}
                  {result.errors.map((item) => <li key={item}>{item}</li>)}
                  {result.warnings.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="checks-title">
        <h2 id="checks-title" className="text-xl font-semibold">What the automated checks establish</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {CHECKS.map((check) => <li key={check}>{check}</li>)}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Validation checks record structure and consistency. It cannot prove a cited page supports every claim,
          or replace a successful provider setup test. Production observations are recorded separately above.
        </p>
      </section>

      <section aria-labelledby="labels-title" className="rounded-lg border bg-muted/40 p-5">
        <h2 id="labels-title" className="font-semibold">Read the evidence labels</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Official: provider or Composio documentation. Reported: a named third party. Tested: a dated observation
          from our setup attempt. Inferred: reasoning from known facts. Unknown: not established. Sources can change;
          check their dates before relying on them for launch.
        </p>
      </section>
    </div>
  );
}
