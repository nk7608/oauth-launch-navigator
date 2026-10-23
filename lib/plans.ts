// One place to look up a plan record by slug: the library first, then live-generated plans.
import "server-only";
import { loadGuide } from "@/lib/guides";
import { Plan } from "@/lib/plan-schema";
import { planToMarkdown } from "@/lib/markdown";
import { SCENARIO_LABEL, type Inputs, viewPlan } from "@/lib/rules";
import { getStoredPlan } from "@/lib/runs";

export async function getPlan(slug: string): Promise<Plan | undefined> {
  const library = loadGuide(slug);
  if (library) return library;
  const stored = await getStoredPlan(slug);
  const parsed = stored && Plan.safeParse(stored.plan);
  return parsed?.success ? parsed.data : undefined;
}

const OWNER_LABEL = { you: "You do", agent: "Agent can do" } as const;

/** The plan in the shape agents consume: same order and content as the page. */
export function planToJson(plan: Plan, inputs: Inputs, baseUrl: string) {
  const view = viewPlan(plan, inputs);
  const q = `does=${inputs.does}&users=${inputs.users}`;
  return {
    app: plan.app,
    inputs,
    assumptions: view.assumptions,
    scenario: view.scenario,
    scenarioLabel: SCENARIO_LABEL[view.scenario],
    verdict: view.verdict,
    setupEffort: view.effort,
    wait: view.wait,
    gatekeepers: view.gatekeepers,
    nextAction: view.nextAction,
    agentGuidance:
      "Do steps with owner \"agent\" in order. At the first step with owner \"you\", stop and hand it to the user: never sign in, accept terms, pay, or submit a review on their behalf.",
    steps: view.steps.map((s) => ({ ...s, ownerLabel: OWNER_LABEL[s.owner] })),
    scopes: view.scopes,
    unknowns: view.unknowns,
    evidence: view.evidence,
    composio: plan.composio,
    meta: plan.meta,
    links: {
      page: `${baseUrl}/plan/${plan.app.slug}?${q}`,
      markdown: `${baseUrl}/api/plan/${plan.app.slug}.md?${q}`,
      json: `${baseUrl}/api/plan/${plan.app.slug}.json?${q}`,
    },
  };
}

export function planMarkdown(plan: Plan, inputs: Inputs, baseUrl: string) {
  const q = `does=${inputs.does}&users=${inputs.users}`;
  return planToMarkdown(plan, viewPlan(plan, inputs), `${baseUrl}/plan/${plan.app.slug}?${q}`);
}
