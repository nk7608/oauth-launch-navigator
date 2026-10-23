// Mirrors CLAUDE.md §7b step 3 for one app: 5 fixed Tavily searches, then extract top ~10 URLs.
import { readFileSync, writeFileSync } from "node:fs";
const ROOT = decodeURIComponent(new URL("../..", import.meta.url).pathname).replace(/\/$/, ""); // run from scripts/eval/
const env = Object.fromEntries(readFileSync(`${ROOT}/.env.local`, "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const app = process.argv[2] ?? "Gmail";
const providerDomains = (process.argv[3] ?? "google.com,googleapis.com").split(",");
const tav = (path, body) => fetch(`https://api.tavily.com/${path}`, { method: "POST", headers: { Authorization: `Bearer ${env.TAVILY_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => { if (!r.ok) throw new Error(`${path} ${r.status} ${await r.text()}`); return r.json(); });

const templates = [`${app} developer OAuth app create`, `${app} OAuth scopes`, `${app} app review OR verification OR marketplace approval`, `${app} partner program API access`, `${app} redirect URI`];
const t0 = Date.now();
const results = await Promise.all(templates.map((query) => tav("search", { query, search_depth: "basic", max_results: 6 })));
const seen = new Map();
results.forEach((r, qi) => r.results.forEach((x, rank) => {
  const host = new URL(x.url).hostname;
  const official = providerDomains.some((d) => host.endsWith(d)) ? 2 : host.endsWith("composio.dev") ? 1 : 0;
  const score = official * 10 + x.score * 5 - rank;
  if (!host.includes("preview.composio.dev") && (!seen.has(x.url) || seen.get(x.url).score < score)) seen.set(x.url, { url: x.url, title: x.title, score, query: templates[qi] });
}));
const top = [...seen.values()].sort((a, b) => b.score - a.score).slice(0, 10);
const ex = await tav("extract", { urls: top.map((t) => t.url), extract_depth: "basic" });
const sources = top.map((t) => ({ ...t, content: ex.results.find((r) => r.url === t.url)?.raw_content ?? null })).filter((s) => s.content);
sources.forEach((s, i) => (s.id = `S${i + 1}`));
writeFileSync(`sources-${app.toLowerCase()}.json`, JSON.stringify(sources, null, 1));
console.log(`${sources.length} sources in ${((Date.now() - t0) / 1000).toFixed(1)}s (failed extract: ${ex.failed_results?.length ?? 0})`);
sources.forEach((s) => console.log(`${s.id} ${String(s.content.length).padStart(7)}ch  ${s.url}`));
