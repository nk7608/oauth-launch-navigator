// Read-only readiness check. No API calls and no secret values printed.
// --production additionally requires private Blob credentials.
import { loadEnvConfig } from "@next/env";
import { generationSetupIssue } from "../lib/config";

loadEnvConfig(process.cwd());
const production = process.argv.includes("--production") || Boolean(process.env.VERCEL);
const issues: string[] = [];
const issue = generationSetupIssue({ ...process.env, ...(production ? { VERCEL: "1" } : {}) });
if (issue) issues.push(issue);
if (process.env.ANTHROPIC_API_KEY) issues.push("ANTHROPIC_API_KEY must not be configured for this project.");
const model = process.env.LLM_MODEL || "dots-studio/dots-3-note-preview:free";
const fallbacks = (process.env.LLM_FALLBACK_MODELS || "recursive/flint-v1.0:free").split(",").map((m) => m.trim()).filter(Boolean);
if (![model, ...fallbacks].every((m) => m.endsWith(":free"))) {
  issues.push("This free-tier deployment requires :free primary and fallback models.");
}
const limit = process.env.VISITOR_RUNS_PER_HOUR;
if (limit && (!Number.isSafeInteger(Number(limit)) || Number(limit) < 1)) {
  issues.push("VISITOR_RUNS_PER_HOUR must be a positive integer.");
}
if (issues.length) {
  console.error(`Deployment check failed (${production ? "production" : "local"}):`);
  for (const message of issues) console.error(`  ${message}`);
  process.exitCode = 1;
} else {
  console.log(`PASS ${production ? "production" : "local"} configuration: required keys present, OpenRouter free models selected${production ? ", Blob credential present" : ""}.`);
  console.log("This checks configuration only; use npm run check-keys to verify service access.");
  if (production) console.log("Confirm the connected Blob store uses Private access in Vercel before deploying.");
}
