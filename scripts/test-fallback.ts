// Deterministic failure-path checks: no real services or credits are used.
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as streamRun } from "../app/api/generate/[runId]/route";
import { POST } from "../app/api/generate/route";
import { runPipeline, starterPlan } from "../lib/pipeline";
import { Plan } from "../lib/plan-schema";
import { computeScenarioByInput, viewPlan } from "../lib/rules";
import { releaseVisitorSlot, takeVisitorSlot, visitorId } from "../lib/runs";
import { store } from "../lib/store";

async function main() {
  const memory = new Map<string, unknown>();
  store.get = async <T>(key: string) => structuredClone(memory.get(key)) as T | undefined;
  store.set = async (key, value) => { memory.set(key, structuredClone(value)); };
  store.delete = async (key) => { memory.delete(key); };
  Object.assign(process.env, { COMPOSIO_API_KEY: "fixture", OPENROUTER_API_KEY: "fixture", TAVILY_API_KEY: "fixture", LLM_PROVIDER: "openrouter" });
  delete process.env.VERCEL;
  let mode = "daily";
  let remaining = 5;
  let calls: string[] = [];
  const json = (body: unknown, status = 200) => Response.json(body, { status });
  let modelCalls = 0;
  globalThis.fetch = async (input, options) => {
    if (options?.signal?.aborted) throw options.signal.reason;
    const url = String(input); calls.push(url);
    if (url.endsWith("/key")) return json({ data: { free_model_daily_requests: { remaining } } });
    if (url.includes("composio.dev/api")) {
      if (mode === "api-key") return url.includes("?search=")
        ? json({ items: [{ slug: "algolia", name: "Algolia" }] })
        : json({ slug: "algolia", name: "Algolia", auth_schemes: ["API_KEY"], composio_managed_auth_schemes: [] });
      if (mode === "composio-down") return json({}, 429);
      if (mode === "unknown") return url.includes("?search=") ? json({ items: [] }) : json({}, 404);
      if (url.includes("?search=")) return json({ items: [{ slug: "airtable", name: "Airtable" }] });
      return json({ slug: "airtable", name: "Airtable", auth_schemes: ["OAUTH2"], composio_managed_auth_schemes: ["OAUTH2"] });
    }
    if (url.endsWith("/search")) {
      if (mode === "search-down") return json({}, 432);
      return json({ results: mode === "unknown" ? [] : [1, 2].map((i) => ({ url: `https://airtable.com/docs/${i}`, title: `Airtable OAuth ${i}`, content: "OAuth registration and scopes", score: 1 })) });
    }
    if (url.endsWith("/extract")) return json({}, 429);
    if (url.endsWith(".md")) return new Response("# Airtable OAuth documentation");
    if (url.endsWith("/chat/completions") && mode === "repair-quota" && modelCalls++ === 0) return json({ model: "fixture", choices: [{ message: { content: JSON.stringify({
      summary: { setupEffort: "Unknown", nextAction: "Check the source.", gatekeepers: [] },
      scopes: [], steps: [{ id: "s1", phase: "register", title: "Check provider requirements", detail: "Review the available documentation.", owner: "you", evidence: ["missing"] }],
      unknowns: [], evidence: [{ id: "e1", label: "official", checkedAt: "2026-10-23", claim: "Provider documentation was retrieved.", sourceTitle: "Airtable", url: "https://airtable.com/docs/1" }],
    }) } }] });
    if (url.endsWith("/chat/completions")) return json({ error: { code: 429, message: "daily limit free-models-per-day" } }, 429);
    throw new Error(`Unexpected fixture URL: ${url}`);
  };
  const run = () => runPipeline("Airtable", () => {}, new AbortController().signal);
  const checkStarter = (plan: ReturnType<typeof starterPlan>) => {
    assert.equal(Plan.safeParse(plan).success, true);
    assert.equal(plan.meta.status, "partial");
    assert.ok(plan.meta.fallback);
    assert.equal(plan.steps.length, 0);
    assert.equal(plan.scopes.length, 0);
    assert.deepEqual(plan.scenarioByInput, computeScenarioByInput(plan));
    for (const scenario of Object.values(plan.scenarioByInput)) assert.equal(scenario, "H_insufficient_info");
    assert.equal(viewPlan(plan, { does: "read", users: "customers" }).wait.none, "Unknown");
  };
  let result = await run();
  checkStarter(result.plan);
  assert.ok(result.plan.evidence.some((e) => e.url === "https://airtable.com/docs/1"), "AI quota failure preserves search snippets even after extraction throttles");
  assert.equal(calls.filter((u) => u.endsWith("/chat/completions")).length, 1, "daily exhaustion does not retry");
  mode = "search-down"; calls = [];
  result = await run(); checkStarter(result.plan);
  assert.ok(result.plan.meta.fallback?.composioChecked);
  assert.equal(calls.some((u) => u.endsWith("/chat/completions")), false);
  mode = "composio-down"; calls = [];
  result = await runPipeline("Salesforce", () => {}, new AbortController().signal); checkStarter(result.plan);
  assert.ok(result.plan.evidence[0].claim.includes("catalog snapshot"));
  assert.equal(calls.some((u) => u.endsWith("/search")), false);
  mode = "unknown"; calls = [];
  result = await runPipeline("Fictional Test App", () => {}, new AbortController().signal);
  assert.equal(result.plan.steps.length, 0);
  assert.equal(calls.some((u) => u.endsWith("/chat/completions")), false);
  const request = (query: string, retry = false) => new NextRequest("http://localhost/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, retry }) });
  remaining = 0; mode = "daily"; calls = [];
  let response = await POST(request("Airtable"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).slug, "airtable");
  const stored = memory.get("plans/airtable.json") as { plan: ReturnType<typeof starterPlan> };
  checkStarter(stored.plan);
  assert.equal(calls.some((u) => u.endsWith("/search") || u.includes("/chat/")), false, "quota precheck spends no search/model credits");
  const before = calls.length;
  await POST(request("Airtable"));
  assert.equal(calls.length, before, "starter cooldown uses no provider calls");
  remaining = 5;
  response = await POST(request("Airtable", true));
  assert.equal((await response.json()).runId, undefined, "the last free requests of the day are kept for the demo path");
  remaining = 20;
  response = await POST(request("Airtable", true));
  assert.ok((await response.json()).runId, "a starter can be upgraded when allowance returns");
  memory.clear();
  const visitor = visitorId(new Headers());
  memory.set(`limits/${visitor}.json`, [Date.now(), Date.now(), Date.now()]);
  response = await POST(request("Salesforce"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).slug, "salesforce");
  assert.equal((memory.get(`limits/${visitor}.json`) as number[]).length, 3, "blocked starts do not consume allowance");
  memory.clear();
  const slot = await takeVisitorSlot("test-visitor");
  assert.ok(slot.at);
  await releaseVisitorSlot({ visitor: "test-visitor", at: slot.at! });
  assert.deepEqual(memory.get("limits/test-visitor.json"), [], "failed/cancelled slot is refundable");
  await releaseVisitorSlot({ visitor: "test-visitor", at: slot.at! });
  assert.deepEqual(memory.get("limits/test-visitor.json"), [], "refund is idempotent");
  memory.clear(); remaining = 0; mode = "api-key"; calls = [];
  response = await POST(request("Algolia"));
  assert.equal(response.status, 200);
  const keyPlan = (memory.get("plans/algolia.json") as { plan: ReturnType<typeof starterPlan> }).plan;
  assert.equal(keyPlan.meta.fallback, undefined);
  assert.equal(keyPlan.scenarioByInput["read|customers"], "F_not_oauth", "API-key guidance remains available with zero AI quota");
  assert.equal(calls.some((u) => u.endsWith("/search") || u.includes("/chat/")), false);
  memory.clear(); mode = "repair-quota"; calls = []; modelCalls = 0;
  result = await run();
  assert.equal(result.plan.meta.status, "partial");
  assert.equal(result.plan.steps.length, 1, "repair quota preserves the first draft as partial");
  assert.ok(result.plan.evidence.some((e) => e.id === "u1" && e.label === "unknown"));
  memory.clear(); mode = "daily"; remaining = 5; calls = [];
  memory.set("active/index.json", { one: { runId: "one", startedAt: Date.now() }, two: { runId: "two", startedAt: Date.now() } });
  response = await POST(request("Salesforce"));
  assert.equal(response.status, 200);
  assert.equal(memory.has(`limits/${visitor}.json`), false, "busy requests reserve no visitor slot");
  assert.equal(calls.length, 0, "catalog starter during congestion calls no provider");
  memory.clear();
  const cancelSlot = await takeVisitorSlot("cancel-test");
  const runId = "cancel-fixture";
  memory.set(`runs/${runId}.json`, { id: runId, query: "Airtable", slug: "airtable", status: "pending", createdAt: Date.now(), visitorSlot: { visitor: "cancel-test", at: cancelSlot.at } });
  const controller = new AbortController(); controller.abort();
  const cancelledStream = await streamRun(new NextRequest(`http://localhost/api/generate/${runId}`, { signal: controller.signal }), { params: Promise.resolve({ runId }) });
  await cancelledStream.text();
  assert.equal((memory.get(`runs/${runId}.json`) as { status: string }).status, "cancelled");
  assert.deepEqual(memory.get("limits/cancel-test.json"), [], "the SSE cancellation handler refunds its slot");
  assert.deepEqual(memory.get("active/index.json"), {}, "cancellation clears the active run");
  const unknown = starterPlan("Mystery Tool", "Search unavailable");
  checkStarter(unknown);
  assert.equal(unknown.meta.fallback?.composioChecked, false, "an unchecked app is not declared unsupported");
  console.log("Fallback checks passed: AI quota, search/extraction throttling, Composio outage, unknown app, cooldown, upgrade, visitor cap, refunds and the API-key path at zero AI quota, repair quota, congestion and SSE cancellation. No credits used.");

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
