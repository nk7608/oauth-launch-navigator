// Launch-plan record: researched once per app, rendered for humans (web) and agents (JSON/Markdown).
// User inputs (capability, audience) re-compute the plan from this record with fixed rules — no new AI call.
import { z } from "zod";

export const EvidenceLabel = z.enum(["official", "reported", "tested", "inferred", "unknown"]);

export const Evidence = z.object({
  id: z.string(),                       // e.g. "e1"
  label: EvidenceLabel,
  claim: z.string(),                    // plain-language claim this source supports
  sourceTitle: z.string(),
  url: z.string().url().optional(),     // required unless label is "inferred" or "unknown"
  checkedAt: z.string(),                // ISO date
  note: z.string().optional(),          // e.g. "conflicts with <source>; official wins"
});

export const Capability = z.enum(["read", "write", "both"]);       // "What will your agent do?"
export const Audience = z.enum(["me", "team", "customers"]);      // "Who will connect accounts?"

export const Scenario = z.enum([
  "A_ready_to_use",          // managed app covers testing / just-me use
  "B_switch_to_own_app",     // managed exists, production needs own app
  "C_own_app_required",      // no managed app
  "D_review_required",       // provider review for chosen capability + audience
  "E_gated_access",          // apply / partner program first
  "F_not_oauth",             // API key, basic, SAML, etc.
  "G_not_in_composio",       // no Composio toolkit
  "H_insufficient_info",     // not enough reliable information
]);

export const Scope = z.object({
  scope: z.string(),
  allows: z.string(),
  capability: Capability,             // which user choice needs this scope
  tier: z.enum(["basic", "sensitive", "restricted", "provider_review", "none", "unknown"]),
  triggers: z.string(),               // what review/approval it causes, in plain words
  evidence: z.array(z.string()),      // evidence ids
});

export const Step = z.object({
  id: z.string(),
  phase: z.enum(["prepare", "register", "connect_composio", "get_approved", "launch"]),
  title: z.string(),                  // imperative, one line
  detail: z.string(),                 // 1–3 sentences, the actual instruction
  owner: z.enum(["you", "agent"]),    // "You do" vs "Agent can do"
  appliesTo: z.object({ capability: z.array(Capability).optional(), audience: z.array(Audience).optional() }).optional(),
  copyValues: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  link: z.object({ label: z.string(), url: z.string().url() }).optional(),   // supports the step; never replaces it
  blocker: z.object({ symptom: z.string(), cause: z.string(), fix: z.string() }).optional(), // shown inline
  evidence: z.array(z.string()),
});

export const Plan = z.object({
  app: z.object({
    name: z.string(), slug: z.string(), website: z.string().optional(), category: z.string().optional(),
  }),
  composio: z.object({
    toolkitExists: z.boolean(),
    toolkitSlug: z.string().optional(),
    authSchemes: z.array(z.string()),           // from Composio API, not the LLM
    managedAppAvailable: z.boolean(),           // from composio_managed_auth_schemes
  }),
  scenarioByInput: z.record(z.string(), Scenario), // key "read|customers" etc. → scenario (computed by rules)
  // Provider-level gates that don't come from a single scope (feed the rules engine in lib/rules.ts).
  access: z.object({
    gated: z.boolean(),               // must apply / join a partner program before real use (scenario E)
    reviewForCustomers: z.boolean(),  // provider reviews the app itself before outside users can connect
    note: z.string().optional(),      // plain-words reason, shown in the verdict
    evidence: z.array(z.string()),
  }).optional(),
  summary: z.object({
    setupEffort: z.string(),                    // e.g. "A few hours (estimate)"
    waitOfficial: z.string().optional(),        // provider's own wording
    waitReported: z.string().optional(),        // third-party reports, labeled
    gatekeepers: z.array(z.string()),
    nextAction: z.string(),
  }),
  scopes: z.array(Scope),
  steps: z.array(Step),
  unknowns: z.array(z.string()),
  evidence: z.array(Evidence),
  meta: z.object({
    status: z.enum(["reference", "verified", "generated", "partial"]),
    generatedAt: z.string(),
    model: z.string().optional(),
    reviewedBy: z.string().optional(),
    fallback: z.object({ reason: z.string(), composioChecked: z.boolean() }).optional(),
  }),
});

export type Plan = z.infer<typeof Plan>;

// Validator rules beyond the schema (implement in lib/validate.ts):
// 1. Every step and scope references ≥1 evidence id that exists.
// 2. Evidence with label official|reported|tested must have a url.
// 3. No time/wait estimate without an evidence id; otherwise "Unknown".
// 4. composio.* fields must come from the Composio API response, never from model output.
// 5. Known-facts checklist (data/known-facts.json) must match where the app is covered.
