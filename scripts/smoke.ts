// Read-only HTTP checks. Run against npm start, or pass a deployed origin.
// Never starts live research or spends API credits.
import assert from "node:assert/strict";
import { z } from "zod";
import { Plan } from "../lib/plan-schema";
import { generationSetupIssue } from "../lib/config";
import { freeRequestsRemaining } from "../lib/quota";

const base = new URL(process.argv[2] || "http://localhost:3000").origin;
const responseSchema = z.object({
  app: Plan.shape.app,
  inputs: z.object({ does: z.enum(["read", "write", "both"]), users: z.enum(["me", "team", "customers"]) }),
  scenario: z.string(),
  steps: Plan.shape.steps,
  scopes: Plan.shape.scopes,
  evidence: Plan.shape.evidence,
  assumptions: z.array(z.string()).min(3),
  agentGuidance: z.string(),
  links: z.object({ page: z.string().url(), markdown: z.string().url(), json: z.string().url() }),
});
async function read(path: string, status = 200) {
  const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(30_000) });
  assert.equal(res.status, status, `${path}: HTTP ${res.status}`);
  return res;
}

async function main() {
  // Regression: an absent free-request counter must not be mistaken for a spending allowance.
  assert.equal(freeRequestsRemaining({ free_model_daily_requests: { remaining: 47 } }), 47);
  assert.equal(freeRequestsRemaining({ free_model_daily_requests: { remaining: 0 } }), 0);
  assert.equal(freeRequestsRemaining(undefined), undefined);
  assert.equal(freeRequestsRemaining({}), undefined);
  const keys = { COMPOSIO_API_KEY: "test", OPENROUTER_API_KEY: "test", TAVILY_API_KEY: "test" };
  assert.equal(generationSetupIssue(keys), undefined);
  assert.match(generationSetupIssue({ ...keys, VERCEL: "1" })!, /BLOB_READ_WRITE_TOKEN/);
  assert.equal(generationSetupIssue({ ...keys, VERCEL: "1", BLOB_READ_WRITE_TOKEN: "test" }), undefined);
  assert.match(generationSetupIssue({ ...keys, LLM_PROVIDER: "unsupported" })!, /openrouter/);
  console.log("PASS free-request quota and deployment configuration guards");

  assert.match(await (await read("/")).text(), /researched guides ready/);
  assert.match(await (await read("/verification")).text(), /We set up real OAuth apps/);

  const customerScenario: Record<string, string> = {
    gmail: "D_review_required", github: "B_switch_to_own_app", slack: "D_review_required",
    pipedrive: "C_own_app_required", outlook: "D_review_required", notion: "B_switch_to_own_app", trello: "B_switch_to_own_app",
  };
  for (const [slug, customers] of Object.entries(customerScenario)) {
    for (const does of ["read", "write", "both"]) {
      for (const users of ["me", "team", "customers"]) {
        const q = `does=${does}&users=${users}`;
        const data = responseSchema.parse(await (await read(`/api/plan/${slug}.json?${q}`)).json());
        assert.equal(data.app.slug, slug);
        assert.deepEqual(data.inputs, { does, users });
        const expected = slug === "pipedrive" ? "C_own_app_required" : users === "me" ? "A_ready_to_use" : users === "customers" ? customers : "B_switch_to_own_app";
        assert.equal(data.scenario, expected, `${slug} ${q}`);
        assert.ok(data.steps.length > 0);
        assert.match(data.agentGuidance, /stop and hand it to the user/);
        const ids = new Set(data.evidence.map((e) => e.id));
        for (const s of [...data.steps, ...data.scopes]) for (const id of s.evidence) assert.ok(ids.has(id), `${slug}: missing evidence ${id}`);
        assert.equal(new URL(data.links.page).search, `?${q}`);
        if (slug === "gmail" && users === "customers") {
          assert.equal(data.steps.some((s) => s.id === "s9b"), does !== "write", "Send-only Gmail must omit the security assessment");
        }
        if (slug === "notion") assert.equal(data.scopes.length, 0, "Notion must not invent OAuth scopes");
      }
    }
    const md = await read(`/api/plan/${slug}.md?does=write&users=customers`);
    assert.match(md.headers.get("content-type") || "", /text\/markdown/);
    const text = await md.text();
    assert.match(text, /You do/);
    assert.ok(text.includes(`/plan/${slug}?does=write&users=customers`));
    assert.ok((await (await read(`/plan/${slug}?does=write&users=customers`)).text()).includes("unlisted but public"));
    console.log(`PASS ${slug}: all 9 input combinations, evidence, Markdown and shared page`);
  }
  await read("/api/plan/this-guide-does-not-exist.json", 404);
  const cached = await fetch(`${base}/api/generate`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "notion" }),
  });
  assert.equal(cached.status, 200);
  assert.equal((await cached.json()).cached, true);
  const invalid = await fetch(`${base}/api/generate`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  assert.equal(invalid.status, 400);
  console.log("PASS unknown guide, cached generation and invalid input; no live research started");
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
