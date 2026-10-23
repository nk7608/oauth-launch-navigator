// Plan validators (CLAUDE.md §7b step 5, lib/plan-schema.ts rules). Used by `npm run validate` and the live pipeline.
import knownFacts from "@/data/known-facts.json";
import { Plan } from "@/lib/plan-schema";
import { COMPOSIO_EVIDENCE, computeScenarioByInput } from "@/lib/rules";

export type ComposioFacts = { toolkitExists: boolean; toolkitSlug?: string; authSchemes: string[]; managedAppAvailable: boolean };

export type ValidationResult = { ok: boolean; errors: string[]; warnings: string[]; plan?: Plan };

const DURATION = /\b\d+\s*(?:[–-]\s*\d+\s*)?(?:business\s+)?(?:minutes?|hours?|days?|weeks?|months?)\b|\bseveral (?:days|weeks|months)\b/i;

export function validatePlan(
  raw: unknown,
  opts: { composio?: ComposioFacts; sourceUrls?: string[] } = {},
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = Plan.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `schema: ${i.path.join(".")}: ${i.message}`), warnings };
  }
  const plan = parsed.data;
  const ids = new Set([...plan.evidence.map((e) => e.id), ...COMPOSIO_EVIDENCE.map((e) => e.id)]);

  // 1. Every step and scope cites ≥1 evidence id that exists.
  for (const s of plan.steps) {
    if (!s.evidence.length) errors.push(`step ${s.id}: no evidence`);
    for (const id of s.evidence) if (!ids.has(id)) errors.push(`step ${s.id}: evidence "${id}" doesn't exist`);
  }
  for (const s of plan.scopes) {
    if (!s.evidence.length) errors.push(`scope ${s.scope}: no evidence`);
    for (const id of s.evidence) if (!ids.has(id)) errors.push(`scope ${s.scope}: evidence "${id}" doesn't exist`);
  }
  for (const id of plan.access?.evidence ?? []) if (!ids.has(id)) errors.push(`access: evidence "${id}" doesn't exist`);
  const dupes = plan.evidence.map((e) => e.id).filter((id, i, a) => a.indexOf(id) !== i);
  if (dupes.length) errors.push(`evidence ids repeated: ${[...new Set(dupes)].join(", ")}`);

  // 2. official|reported|tested evidence needs a url; live plans may only cite the sources they were given.
  const allowed = opts.sourceUrls ? new Set([...opts.sourceUrls, ...COMPOSIO_EVIDENCE.map((e) => e.url!)]) : undefined;
  for (const e of plan.evidence) {
    if (["official", "reported", "tested"].includes(e.label) && !e.url) errors.push(`evidence ${e.id}: label "${e.label}" needs a url`);
    if (allowed && e.url && !allowed.has(e.url)) errors.push(`evidence ${e.id}: url ${e.url} isn't one of the provided sources`);
  }

  // 3. No time/wait estimate without supporting evidence; otherwise "Unknown".
  const timedClaims = plan.evidence.filter((e) => e.label !== "unknown" && DURATION.test(e.claim));
  for (const [field, value] of [
    ["waitOfficial", plan.summary.waitOfficial],
    ["waitReported", plan.summary.waitReported],
  ] as const) {
    if (value && DURATION.test(value) && !timedClaims.length) errors.push(`summary.${field} gives a duration but no evidence claim states one`);
  }
  if (plan.summary.waitReported && DURATION.test(plan.summary.waitReported) && !plan.evidence.some((e) => e.label === "reported" && DURATION.test(e.claim))) {
    errors.push("summary.waitReported gives a duration but no 'reported' evidence states one");
  }
  if (DURATION.test(plan.summary.setupEffort) && !/estimate|unknown/i.test(plan.summary.setupEffort)) {
    warnings.push('summary.setupEffort gives a duration without saying it is an estimate');
  }

  // 4. Composio fields must match the API (or the synced catalog for library plans).
  if (opts.composio) {
    const c = opts.composio;
    if (plan.composio.toolkitExists !== c.toolkitExists) errors.push(`composio.toolkitExists should be ${c.toolkitExists}`);
    if (plan.composio.managedAppAvailable !== c.managedAppAvailable) errors.push(`composio.managedAppAvailable should be ${c.managedAppAvailable}`);
    const a = [...plan.composio.authSchemes].sort().join(",");
    const b = [...c.authSchemes].sort().join(",");
    if (a !== b) errors.push(`composio.authSchemes should be [${b}], got [${a}]`);
  }

  // 5. Stored routing must equal the rules engine (the page always uses the rules).
  const computed = computeScenarioByInput(plan);
  for (const [k, v] of Object.entries(computed)) {
    if (plan.scenarioByInput[k] !== v) errors.push(`scenarioByInput["${k}"] is ${plan.scenarioByInput[k] ?? "missing"}, rules give ${v}`);
  }

  // 6. Known facts for this app.
  for (const f of knownFacts.facts as { app: string; check: string; source?: string; assert?: Assert }[]) {
    if (f.app !== plan.app.slug || !f.assert) continue;
    if (!checkAssert(plan, f.assert)) errors.push(`known fact failed: ${f.check} (${f.source ?? ""})`);
  }

  if (!plan.steps.length && plan.meta.status !== "partial") errors.push("no steps");
  if (!plan.summary.nextAction) errors.push("summary.nextAction is empty");
  return { ok: errors.length === 0, errors, warnings, plan };
}

type Assert = { path: string; equals?: unknown; includes?: unknown };

/** Tiny path reader: "scopes[scope=<value>].tier", "scenarioByInput.read|customers". */
function readPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const m of path.matchAll(/\[([^=\]]+)=([^\]]+)\]|([^.[]+)/g)) {
    if (cur == null) return undefined;
    if (m[3] !== undefined) cur = (cur as Record<string, unknown>)[m[3]];
    else cur = (cur as Record<string, unknown>[]).find?.((x) => String(x[m[1]]) === m[2]);
  }
  return cur;
}

function checkAssert(plan: Plan, a: Assert): boolean {
  const v = readPath(plan, a.path);
  if ("equals" in a) return v === a.equals;
  if ("includes" in a) return Array.isArray(v) && v.includes(a.includes);
  return true;
}
