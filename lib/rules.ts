// Fixed rules that turn one stored plan record + the two user inputs into the plan a developer sees.
// No AI here: changing "What will your agent do?" or "Who will connect?" only re-runs these functions.
import type { z } from "zod";
import type { Audience as AudienceSchema, Capability as CapabilitySchema, Evidence, Plan, Scenario as ScenarioSchema, Scope, Step } from "@/lib/plan-schema";

export type Capability = z.infer<typeof CapabilitySchema>;
export type Audience = z.infer<typeof AudienceSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type PlanStep = z.infer<typeof Step>;
export type PlanScope = z.infer<typeof Scope>;
export type PlanEvidence = z.infer<typeof Evidence>;
export type Phase = PlanStep["phase"];

export type Inputs = { does: Capability; users: Audience };

export const DEFAULT_INPUTS: Inputs = { does: "both", users: "customers" };

export const CAPABILITY_OPTIONS: { value: Capability; label: string; hint: string }[] = [
  { value: "read", label: "Read", hint: "Look things up" },
  { value: "write", label: "Write", hint: "Change or send" },
  { value: "both", label: "Not sure", hint: "Read and write" },
];

export const AUDIENCE_OPTIONS: { value: Audience; label: string; hint: string }[] = [
  { value: "me", label: "Just me", hint: "Testing" },
  { value: "team", label: "My team", hint: "Coworkers" },
  { value: "customers", label: "Customers", hint: "Outside users" },
];

export const PHASES: { id: Phase; label: string }[] = [
  { id: "prepare", label: "Prepare" },
  { id: "register", label: "Register" },
  { id: "connect_composio", label: "Connect to Composio" },
  { id: "get_approved", label: "Get approved" },
  { id: "launch", label: "Launch" },
];

export const SCENARIO_LABEL: Record<Scenario, string> = {
  A_ready_to_use: "Ready to use",
  B_switch_to_own_app: "Switch to your own app",
  C_own_app_required: "Own app required",
  D_review_required: "Review required",
  E_gated_access: "Apply for access first",
  F_not_oauth: "Not OAuth",
  G_not_in_composio: "Not in Composio yet",
  H_insufficient_info: "Not enough reliable info",
};

export const REQUEST_BOARD_URL = "https://request.composio.dev/boards/tool-requests";
const OAUTH_SCHEMES = ["OAUTH2", "OAUTH1", "S2S_OAUTH2", "DCR_OAUTH"];
const REVIEW_TIERS: PlanScope["tier"][] = ["sensitive", "restricted", "provider_review"];
const TIER_RANK: Record<PlanScope["tier"], number> = { none: 0, basic: 1, unknown: 2, sensitive: 3, provider_review: 4, restricted: 5 };

/** Facts from Composio's own docs that every plan may lean on (ids prefixed "c" to avoid clashes). */
export const COMPOSIO_EVIDENCE: PlanEvidence[] = [
  {
    id: "c1",
    label: "official",
    claim:
      "Composio registers and maintains OAuth apps for popular toolkits, so you can create a session and start testing with no OAuth app of your own. Users see \"Composio wants to access your account\" on the consent screen.",
    sourceTitle: "Composio: Managed vs custom auth",
    url: "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app",
    checkedAt: "2026-10-23",
  },
  {
    id: "c2",
    label: "official",
    claim:
      "Switch to your own OAuth app when users should see your name on the consent screen, you need scopes beyond Composio's defaults, you're hitting the shared rate limits, or you need triggers to poll faster than the managed 15-minute minimum.",
    sourceTitle: "Composio: Managed vs custom auth",
    url: "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app",
    checkedAt: "2026-10-23",
  },
  {
    id: "c3",
    label: "official",
    claim: "Toolkits Composio doesn't support yet can be requested on the public tool-request board.",
    sourceTitle: "Composio: Tool requests",
    url: REQUEST_BOARD_URL,
    checkedAt: "2026-10-23",
  },
];

export function parseInputs(sp: { get(name: string): string | null } | Record<string, string | string[] | undefined>): Inputs {
  const read = (k: string) => {
    const v = "get" in sp && typeof sp.get === "function" ? sp.get(k) : (sp as Record<string, unknown>)[k];
    return typeof v === "string" ? v : undefined;
  };
  const does = read("does");
  const users = read("users");
  return {
    does: CAPABILITY_OPTIONS.some((o) => o.value === does) ? (does as Capability) : DEFAULT_INPUTS.does,
    users: AUDIENCE_OPTIONS.some((o) => o.value === users) ? (users as Audience) : DEFAULT_INPUTS.users,
  };
}

export function scopesFor(plan: Plan, does: Capability): PlanScope[] {
  return does === "both" ? plan.scopes : plan.scopes.filter((s) => s.capability === does);
}

function hasOAuth(plan: Plan) {
  return plan.composio.authSchemes.some((s) => OAUTH_SCHEMES.includes(s));
}

/** The routing rules (research skill "Scenario routing"), applied per input pair. */
export function routeScenario(plan: Plan, { does, users }: Inputs): Scenario {
  if (plan.meta.status === "partial" && plan.steps.length === 0) return "H_insufficient_info";
  if (!plan.composio.toolkitExists) return "G_not_in_composio";
  if (!hasOAuth(plan)) return "F_not_oauth";
  const managed = plan.composio.managedAppAvailable;
  if (plan.access?.gated && !(users === "me" && managed)) return "E_gated_access";
  if (users === "me") return managed ? "A_ready_to_use" : "C_own_app_required";
  if (users === "customers") {
    const reviewScope = scopesFor(plan, does).some((s) => REVIEW_TIERS.includes(s.tier));
    if (reviewScope || plan.access?.reviewForCustomers) return "D_review_required";
  }
  return managed ? "B_switch_to_own_app" : "C_own_app_required";
}

export function computeScenarioByInput(plan: Plan): Record<string, Scenario> {
  const out: Record<string, Scenario> = {};
  for (const c of CAPABILITY_OPTIONS) for (const a of AUDIENCE_OPTIONS) out[`${c.value}|${a.value}`] = routeScenario(plan, { does: c.value, users: a.value });
  return out;
}

function stepApplies(step: PlanStep, { does, users }: Inputs) {
  const cap = step.appliesTo?.capability;
  const aud = step.appliesTo?.audience;
  // A step tagged "both" means "needs read and write"; a step tagged read applies when the agent reads (read or both).
  const capOk = !cap || cap.includes(does) || (does === "both" && cap.length > 0);
  return capOk && (!aud || aud.includes(users));
}

/** Steps for scenario A: use Composio's managed app now; your own app comes later. */
function managedSteps(plan: Plan): PlanStep[] {
  const app = plan.app.name;
  const slug = plan.composio.toolkitSlug ?? plan.app.slug;
  return [
    {
      id: "m1",
      phase: "connect_composio",
      title: `Use Composio's managed ${app} app`,
      detail: `Composio already has a registered ${app} OAuth app, so you don't need your own while you're testing. Sessions use it by default unless you pass your own auth config.`,
      owner: "agent",
      copyValues: [
        {
          label: "TypeScript",
          value: `const session = await composio.create("user_123");\n// ${slug} uses Composio managed auth unless authConfigs.${slug} is set`,
        },
      ],
      evidence: ["c1"],
    },
    {
      id: "m2",
      phase: "connect_composio",
      title: "Connect your account and run one tool",
      detail: `Connect your own ${app} account through the Composio Playground or a Connect Link, then run one ${app} tool to confirm it works. The consent screen will say Composio, not your app name.`,
      owner: "you",
      link: { label: "Composio dashboard", url: "https://dashboard.composio.dev/" },
      evidence: ["c1"],
    },
    {
      id: "m3",
      phase: "launch",
      title: "Plan your switch before others connect",
      detail: `Before your team or customers connect, register your own ${app} OAuth app so they see your name and you get your own rate limits. Change "Who will connect accounts?" above to see that plan.`,
      owner: "you",
      evidence: ["c2"],
    },
  ];
}

// For customers, the plan's access note says what still stands between you and them when the provider itself doesn't review.
const accessNote = (p: Plan, c: { customers: boolean }, fallback = "") =>
  c.customers && p.access?.note ? ` ${p.access.note.replace(/\.?$/, ".")}` : fallback;

const VERDICT: Record<Scenario, (p: Plan, ctx: { reason?: string; gatekeeper: string; who: string; customers: boolean }) => string> = {
  A_ready_to_use: (p) => `You can start today: Composio's managed ${p.app.name} app covers testing, so you don't need to register anything yet.`,
  B_switch_to_own_app: (p, c) =>
    `Composio's managed app works for testing, but before ${c.who} ${c.who === "your team" ? "connects" : "connect"} you should register your own ${p.app.name} OAuth app so they see your name.${accessNote(p, c, " No provider review is needed for this setup.")}`,
  C_own_app_required: (p, c) =>
    `Composio has no managed ${p.app.name} app, so you need to register your own OAuth app before anyone can connect.${accessNote(p, c)}`,
  D_review_required: (p, c) =>
    `You need your own ${p.app.name} OAuth app, and ${c.gatekeeper} must approve it before ${c.who} can connect.${c.reason ? ` What's involved: ${c.reason.replace(/\.$/, "")}.` : ""}`,
  E_gated_access: (p, c) => `${p.app.name} limits API access, so apply to ${c.gatekeeper} first. Nothing else moves until that's approved.`,
  F_not_oauth: (p) =>
    `${p.app.name} connects with ${p.composio.authSchemes.map((s) => s.replace(/_/g, " ").toLowerCase()).join(" or ")}, not OAuth, so there's no app to register or review.`,
  G_not_in_composio: (p) =>
    `Composio doesn't support ${p.app.name} yet. You can still set up the provider side now and request the toolkit from Composio.`,
  H_insufficient_info: (p) => `We couldn't find enough reliable information to build a plan for ${p.app.name}.`,
};

const WHO: Record<Audience, string> = { me: "you", team: "your team", customers: "customers" };

export type PlanView = {
  inputs: Inputs;
  scenario: Scenario;
  verdict: string;
  effort: string;
  wait: { official?: string; reported?: string; none?: string };
  gatekeepers: string[];
  assumptions: string[];
  scopes: PlanScope[];
  steps: (PlanStep & { number: number })[];
  phases: { id: Phase; label: string; count: number }[];
  nextAction: string;
  evidence: PlanEvidence[];
  unknowns: string[];
};

export function viewPlan(plan: Plan, inputs: Inputs): PlanView {
  const scenario = routeScenario(plan, inputs);
  const scopes = scopesFor(plan, inputs.does);
  const strongest = [...scopes].sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier])[0];
  const reason =
    plan.access?.reviewForCustomers && plan.access.note
      ? plan.access.note
      : strongest && REVIEW_TIERS.includes(strongest.tier)
        ? strongest.triggers
        : undefined;
  const gatekeeper = plan.summary.gatekeepers[0] ?? "the provider";

  const rawSteps = scenario === "A_ready_to_use" ? managedSteps(plan) : plan.steps.filter((s) => stepApplies(s, inputs));
  const order = PHASES.map((p) => p.id);
  const steps = [...rawSteps]
    .sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase))
    .map((s, i) => ({ ...s, number: i + 1 }));

  const needsReview = scenario === "D_review_required" || scenario === "E_gated_access";
  const wait = needsReview
    ? { official: plan.summary.waitOfficial ?? "Unknown", reported: plan.summary.waitReported }
    : { none: scenario === "A_ready_to_use" ? "None. Start now." : "No provider review for this setup." };

  const effort =
    scenario === "A_ready_to_use"
      ? "Minutes (connect and test with the managed app)"
      : scenario === "H_insufficient_info"
        ? "Unknown"
        : plan.summary.setupEffort;

  const assumptions = [
    `Your agent will ${inputs.does === "read" ? "only read data" : inputs.does === "write" ? "only change or send data" : "read and change data (you weren't sure, so we planned for both)"}.`,
    `${inputs.users === "me" ? "Only you will connect an account, for testing." : inputs.users === "team" ? "People on your team will connect their accounts." : "Customers outside your company will connect their accounts."}`,
    "You're using Composio to store tokens and run tools.",
  ];

  const nextAction =
    scenario === "A_ready_to_use" ? steps[0].title + "." : plan.summary.nextAction || (steps[0] ? steps[0].title + "." : "Review the sources below.");

  const usedIds = new Set([...steps.flatMap((s) => s.evidence), ...scopes.flatMap((s) => s.evidence), ...(plan.access?.evidence ?? [])]);
  const evidence = [...plan.evidence, ...COMPOSIO_EVIDENCE.filter((e) => usedIds.has(e.id) && !plan.evidence.some((x) => x.id === e.id))];

  return {
    inputs,
    scenario,
    verdict: VERDICT[scenario](plan, { reason, gatekeeper, who: WHO[inputs.users], customers: inputs.users === "customers" }),
    effort,
    wait,
    gatekeepers: needsReview || inputs.users === "customers" ? plan.summary.gatekeepers : [],
    assumptions,
    scopes,
    steps,
    phases: PHASES.map((p) => ({ ...p, count: steps.filter((s) => s.phase === p.id).length })),
    nextAction,
    evidence,
    unknowns: plan.unknowns,
  };
}

/** Strongest evidence label among ids, for the chip on a step or scope. */
export function strongestLabel(ids: string[], evidence: PlanEvidence[]): PlanEvidence["label"] {
  const rank: PlanEvidence["label"][] = ["tested", "official", "reported", "inferred", "unknown"];
  const labels = ids.map((id) => evidence.find((e) => e.id === id)?.label ?? "unknown");
  return rank.find((r) => labels.includes(r)) ?? "unknown";
}
