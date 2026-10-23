// npm run validate -- [slug ...] [--fix-scenarios]   (no slugs = every guide in data/guides)
// --fix-scenarios writes scenarioByInput from the rules engine before validating.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getApp } from "@/lib/apps";
import { computeScenarioByInput } from "@/lib/rules";
import { validatePlan } from "@/lib/validate";

const dir = path.join(process.cwd(), "data", "guides");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const fix = process.argv.includes("--fix-scenarios");
const slugs = args.length ? args : readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));

let failed = 0;
for (const slug of slugs) {
  const file = path.join(dir, `${slug}.json`);
  const raw = JSON.parse(readFileSync(file, "utf8"));
  if (fix) {
    raw.scenarioByInput = computeScenarioByInput(raw);
    writeFileSync(file, JSON.stringify(raw, null, 1) + "\n");
  }
  const app = getApp(slug);
  const composio = app
    ? { toolkitExists: true, authSchemes: app.authSchemes, managedAppAvailable: app.managedAppAvailable }
    : undefined;
  const r = validatePlan(raw, { composio });
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${slug}${composio ? "" : "  (not in catalog: Composio fields not checked)"}`);
  for (const e of r.errors) console.log(`  error: ${e}`);
  for (const w of r.warnings) console.log(`  warn:  ${w}`);
  if (!r.ok) failed++;
}
process.exit(failed ? 1 : 0);
