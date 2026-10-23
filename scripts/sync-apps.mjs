// Regenerates data/apps.json from the live Composio API (v3.1) and prints a diff against the old file.
// Keeps our own fields (name, category, guideStatus, plannedVerified); overwrites Composio facts.
// Usage: node scripts/sync-apps.mjs [--dry-run]
import { readFileSync, writeFileSync } from "node:fs";

const API = "https://backend.composio.dev/api/v3.1";
const APPS_FILE = new URL("../data/apps.json", import.meta.url);
const ENV_FILE = new URL("../.env.local", import.meta.url);
const OAUTH = ["OAUTH2", "OAUTH1", "S2S_OAUTH2", "DCR_OAUTH"];

function envKey(name) {
  if (process.env[name]) return process.env[name];
  const line = readFileSync(ENV_FILE, "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim();
}

async function getJson(path) {
  const res = await fetch(`${API}${path}`, { headers: { "x-api-key": envKey("COMPOSIO_API_KEY") } });
  if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
  return res.json();
}

async function listAllToolkits() {
  const all = [];
  let cursor = "";
  do {
    const page = await getJson(`/toolkits?limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    all.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return new Map(all.map((t) => [t.slug, t]));
}

const old = JSON.parse(readFileSync(APPS_FILE, "utf8"));
const live = await listAllToolkits();
const changes = [];
const missing = [];

const apps = old.apps.map((app) => {
  const t = live.get(app.slug);
  if (!t) {
    missing.push(app.slug);
    return { ...app, inComposio: false };
  }
  const authSchemes = t.auth_schemes ?? [];
  const managedSchemes = t.composio_managed_auth_schemes ?? [];
  // "Managed app" = Composio provides its own OAuth client for at least one OAuth scheme.
  const managedAppAvailable = managedSchemes.some((s) => OAUTH.includes(s));
  const next = {
    ...app,
    managedAppAvailable,
    authSchemes,
    managedAuthSchemes: managedSchemes,
    noAuth: Boolean(t.no_auth),
    toolsCount: t.meta?.tools_count ?? null,
    website: t.meta?.app_url ?? undefined,
    inComposio: true,
  };
  for (const key of ["managedAppAvailable", "authSchemes"]) {
    if (JSON.stringify(app[key]) !== JSON.stringify(next[key])) {
      changes.push(`${app.slug}.${key}: ${JSON.stringify(app[key])} -> ${JSON.stringify(next[key])}`);
    }
  }
  return next;
});

const inComposio = apps.filter((a) => a.inComposio);
const out = {
  _source: `Composio API v3.1 GET /toolkits (live), synced ${new Date().toISOString().slice(0, 10)} by scripts/sync-apps.mjs. Categories are ours.`,
  _counts: {
    total: apps.length,
    managed: inComposio.filter((a) => a.managedAppAvailable).length,
    ownAppRequired: inComposio.filter((a) => !a.managedAppAvailable && a.authSchemes.some((s) => OAUTH.includes(s))).length,
    notOauth: inComposio.filter((a) => !a.authSchemes.some((s) => OAUTH.includes(s))).length,
    notInComposio: missing.length,
    composioToolkitsTotal: live.size,
  },
  apps,
};

console.log(`Live Composio toolkits: ${live.size}`);
console.log(`Snapshot counts: ${JSON.stringify(old._counts)}`);
console.log(`Live counts:     ${JSON.stringify(out._counts)}`);
console.log(`\n${changes.length} changed field(s):`);
changes.forEach((c) => console.log(`  ${c}`));
if (missing.length) console.log(`\nNot found in Composio: ${missing.join(", ")}`);

if (!process.argv.includes("--dry-run")) {
  writeFileSync(APPS_FILE, JSON.stringify(out, null, 1) + "\n");
  console.log("\nWrote data/apps.json");
}
