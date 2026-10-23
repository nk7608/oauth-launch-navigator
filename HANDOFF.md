# OAuth Launch Navigator: knowledge transfer

Status as of 2026-10-23. Read this file, `CLAUDE.md` (the brief) and `.claude/skills/oauth-guide-research/SKILL.md` before continuing.

## Latest continuation: 2026-10-23 (Codex)

- Added Outlook, Notion and Trello library guides; all seven guides validate. Each new guide is in a separate local commit. Status remains `generated`; owner review is still pending.
- Added `/verification`: all six pre-existing Tested findings, source-only coverage, guide statuses, unknowns and validator rules. Reference guides no longer imply completed owner review.
- Completed README and added DEPLOYMENT.md with the proposed project/store, environment setup and production acceptance checklist.
- Corrected the OpenRouter precheck: `limit_remaining` is monetary, while `free_model_daily_requests.remaining` is the request quota. Both configured models are still available with JSON support and zero pricing.
- Added local/production `check-deploy`, a missing-Blob runtime guard, Vercel build settings and upload exclusions. Build traces were verified to exclude `.data/` and `.env*`; all seven guides and the live research skill/schema remain included.
- Added `npm run smoke -- <origin>`: all 63 guide/input combinations, evidence references, Gmail assessment filtering, Notion scopes, Markdown/shared pages, cache/invalid input and quota/config guards. It starts no live research.
- Passed: production build (108 generated pages), lint, all seven guide validations, local configuration check, all smoke checks. Browser: Gmail read→write removes the assessment; step 4 copies its Markdown; share copies the selected URL; verification page renders correctly.
- Production preflight intentionally fails until `BLOB_READ_WRITE_TOKEN` is configured. No deployment, Blob store, GitHub repository or push has been created. J1–J8 on production and the timed demo remain pending.
- Checked the signed-in Vercel Hobby team `nk7608s-projects`: project search for `oauth` returned no results; Storage showed no existing stores. No `.vercel` link or Git remote exists locally. User was unsure whether Claude deployed, so this was checked directly.
- Keys work. Quota observed during this continuation: OpenRouter **47/50 free requests** remaining today; Tavily **993/1000 credits** remaining this month. These counters change. Firecrawl connector is out of credits; official sources were read with web tools instead, so no top-up was needed.
- Local production preview: `http://localhost:3100` (started with `npm start -- --port 3100`); screenshot `/tmp/oauth-launch-verification.jpg`.

Next: show the completed local app and request owner approval for the resources listed in DEPLOYMENT.md. Prefer a direct Vercel CLI deployment to avoid requesting a GitHub push solely for deployment. Never print keys. After approval, configure the private store/environment, deploy and run the production checklist. Do not label production journeys passed before running them.

## 1. Where things stand

| Build step (CLAUDE.md §10) | Status |
|---|---|
| 0. Checks: keys, model choice, apps.json sync | Done |
| 1. Scaffold + catalog home page | Done, committed |
| 2. Plan page, toggles, rules engine | Done, committed |
| 3. JSON/Markdown endpoints + `npm run validate` | Done, committed |
| 4. Library guides: GitHub, Slack, Pipedrive (+ Gmail reference) | Done, committed; waiting for Nayana's review |
| 5. Live pipeline + generating state + quota handling | Done, committed |
| 6. Real setup attempts (GitHub, Google/Gmail, Composio Playground) | Done, committed as Tested evidence |
| 7. More library guides | Done: Outlook, Notion, Trello; sourced, validated, committed |
| 8. `/verification` page, README, Vercel deploy, J1–J8 on prod | Local page/docs/checks done; deployment and production journeys pending approval |

Git: work remains on local `main`, nothing pushed, no remote. `.env.local` and `.data/` are git-ignored.

## 2. Run it locally

```bash
cd "/Users/nayana/Downloads/oauth-launch-navigator "   # folder name ends with a space: keep the quotes
npm install
npm run dev               # http://localhost:3000
npm run check-keys        # tests the 3 keys, prints OK/FAIL only
npm run validate          # validates every guide in data/guides
npm run validate -- --fix-scenarios   # recompute scenarioByInput from the rules, then validate
npm run sync-apps         # refresh data/apps.json from the Composio API
npm run build && npm run lint
```

Keys live only in `.env.local`, which you edit in a text editor (`open -e .env.local`) or with `bash scripts/setup-keys.sh` (hidden input). Never paste keys into chat.

| Variable | Value / note |
|---|---|
| `COMPOSIO_API_KEY` | Works. Has **no tool_execution permission** (good default; run tools in the Playground) |
| `OPENROUTER_API_KEY` | Free tier, 50 requests/day |
| `TAVILY_API_KEY` | Free, 1,000 credits/month; about 45 used so far |
| `LLM_MODEL` | `dots-studio/dots-3-note-preview:free` (chosen in step 0d) |
| `LLM_FALLBACK_MODELS` | optional, comma list; default `recursive/flint-v1.0:free` |
| `LLM_PROVIDER` | `openrouter` (the only backend wired) |
| `VISITOR_RUNS_PER_HOUR` | optional, default 3 (raise for demos) |
| `BLOB_READ_WRITE_TOKEN` | prod only; when set, the store switches from `.data/` to Vercel Blob |

## 3. Architecture and file map

Next.js 16.4 (App Router, `cacheComponents` on) + Tailwind 4 + shadcn (base-nova) + Zod. Key Next 16 rule: anything reading `params`/`searchParams`/request data must sit inside `<Suspense>`; docs ship in `node_modules/next/dist/docs/`.

| Path | What it does |
|---|---|
| `app/page.tsx`, `components/catalog.tsx` | Home: search (name or website), setup-type and category filters, 100 apps grouped by category, "Generate a plan for…" card |
| `app/plan/[slug]/page.tsx`, `components/plan/*` | Plan page: left = two toggles + share/Markdown/JSON; right = verdict, facts, phase path, next action, steps (owner chip, copy, blocker, evidence chip), collapsed Scopes and Sources. Step checkboxes stored in localStorage |
| `app/generate/page.tsx`, `components/generating.tsx` | Generating state: 5 stages, elapsed time, cancel, limit/quota messages |
| `app/api/plan/[slug]/route.ts` | `GET /api/plan/<slug>.json|.md?does=&users=` |
| `app/api/generate/route.ts` | `POST {query}` → `{runId}` or `{slug, cached}`; per-visitor limit, concurrency 2, quota pre-check, dedupe |
| `app/api/generate/[runId]/route.ts` | SSE stream; **the run executes inside this request** (closing it cancels); 240 s cap; `maxDuration = 300` |
| `lib/plan-schema.ts` | Zod schema. **Added optional `access` block** (gated, reviewForCustomers, note, evidence) |
| `lib/rules.ts` | Rules engine: `routeScenario`, `viewPlan` (verdict, waits, steps filtered by `appliesTo`, managed-app steps for scenario A), built-in Composio evidence `c1–c3` |
| `lib/validate.ts`, `scripts/validate.ts` | Validators: schema, evidence ids exist, urls on official/reported/tested, durations need evidence, Composio facts match, scenarios match rules, known facts (`data/known-facts.json` `assert` paths), live plans may only cite retrieved sources |
| `lib/pipeline.ts` | Live pipeline (see §6) |
| `lib/llm.ts` | `complete()` for OpenRouter with `models` fallback list, QuotaError, `remainingQuota()` |
| `lib/composio.ts`, `lib/research.ts` | Composio API facts + toolkit doc; Tavily searches/extract with relevance filter and section excerpts |
| `lib/store.ts`, `lib/runs.ts`, `lib/plans.ts` | JSON store (Blob private / `.data/`), run records, dedupe index, visitor limits, `getPlan()` (library first, then live) |
| `data/apps.json` | 100 apps synced from Composio API v3.1 (67 managed, 33 own-app) |
| `data/guides/*.json` | Library plans (gmail, github, slack, pipedrive) |
| `scripts/eval/` | Model comparison harness used in step 0d |
| `next.config.ts` | `outputFileTracingIncludes` for the skill, schema and guides (read with fs at runtime) |

## 4. Key decisions (and why)

1. **Scenarios come from code, not the model.** The models disagreed on routing in step 0d; `scenarioByInput` is always recomputed by `lib/rules.ts`, and the validator rejects mismatches.
2. **Composio facts always come from the API** and overwrite model output.
3. **No AI call when it can't help:** non-OAuth apps (scenario F) are built from Composio facts; when search finds fewer than 2 results about the app and Composio has no toolkit, the plan is H and lists what was checked (J4).
4. **Two AI calls max per plan** (build + one repair); if still failing, unsupported claims are downgraded to Unknown and the plan is saved as `partial`.
5. **Pipeline runs inside the SSE request** instead of a background job: no polling of storage, and cancel is just closing the stream.
6. **Plan storage: Vercel Blob (private)** in prod, `.data/` locally (Nayana's choice).
7. **Step owners follow the skill strictly:** anything needing the user's login, payment, terms or submission is "You do", so Gmail's "create OAuth client" and "declare scopes" were changed from agent to you.
8. **Commit per verified step, guide edits in separate commits** (git history = corrections log). Never push without asking.

## 5. Library guides

| App | Status | Scenarios | Notable content |
|---|---|---|---|
| Gmail | reference + Tested 2026-10-23 | A me / B team / D customers | Send-only drops the security assessment; new Tested steps and blockers (see §7) |
| GitHub | generated + Tested 2026-10-23 | A / B / B | Org owners approve OAuth apps (restrictions default on for new orgs); `repo` has no read-only option |
| Slack | generated | A / B / D | Unlisted apps for pilots; Marketplace needs 10+ active workspaces, ≤10 business days + ≤10 weeks review; non-Marketplace history reads 1 req/min |
| Pipedrive | generated | C everywhere (J5) | Private apps shareable by unlisted link without review; Marketplace review ≤21 business days |

Nayana still needs to review gmail, github, slack and pipedrive before marking them `verified` (set `meta.status` and `meta.reviewedBy`).

Live plans already generated in `.data/plans/`: algolia (F), hubspot, rippling (G), zorblat-crm and quixotrix-billing (H). They won't exist in prod until regenerated.

## 6. Live pipeline facts (measured)

- Stages: identify (code) → Composio API → Tavily 5 searches + extract top 9 + Composio toolkit doc → one OpenRouter call → validators + optional repair.
- Timing: HubSpot 117 s, Rippling 115 s (target p50 ≤120 s). An earlier unconstrained prompt took 210 s; fixed by capping scopes at 8 and steps at 6–10 and trimming sources to about 6k chars each.
- Model comparison (step 0d, Gmail): dots-3-note-preview best (schema-valid, correct tiers, no invented URLs); flint-v1.0 weaker; Gemma 4 and Xing were rate-limited upstream; Nemotron 3.5 timed out.
- Free models are flaky: OpenRouter `models` fallback handles upstream 429s; daily-quota errors show a friendly message.
- Retrieval lesson: generic search templates miss provider review pages; the relevance filter drops off-topic hits.

## 7. Tested findings (step 6, all recorded in the guides)

- **GitHub:** the form now says "Redirect URIs" (up to 10, optional wildcard); "Expire user access tokens" is on by default and refresh works through Composio; Composio pre-selects 7 scopes; Connect Account opens a separate window; a tool run worked in the Playground.
- **Google/Gmail:**
  - Personal accounts get External only.
  - Testing mode means test users only, with a 100-user lifetime cap.
  - With no test users, sign-in fails with a misleading "composio.dev has not completed the Google verification process" (403 access_denied).
  - Google's "unverified app" warning makes "Back to safety" the highlighted button.
  - Composio's default Gmail scopes are 11, including `https://mail.google.com/` and 9 People API scopes. **Replace them.**
  - Google lets users untick scopes, which leaves an ACTIVE connection that fails with 403 "insufficient authentication scopes". **Check granted scopes.** Reconnecting creates a second connected account.
  - Users still see composio.dev (account chooser) and "Composio wants to connect" (Connect Link). Fix: Project Settings → White Labeling plus a redirect proxy through your domain.
  - The Google client form has a new "Use this client for an AI-powered agent" option (meant for Google MCP tools; left off) and warns settings take 5 minutes to hours.
- **Composio:** connect links expire in 10 minutes; Composio's redirect URI is `https://backend.composio.dev/api/v1/auth-apps/add` (API and dashboard agree).

**Test resources still in Nayana's accounts (delete when done):** GitHub OAuth app "OAuth Launch Navigator (test)"; Composio auth configs `github-own-app-test` and `gmail-own-app-test` plus their connected accounts (project `oauthdemo`); Google Cloud project `oauth-launch-navigator-test`.

## 8. Journey status

| # | Status |
|---|---|
| J1 Gmail toggles/share | Pass locally |
| J2 live new app | Pass locally (HubSpot, Rippling) |
| J3 non-OAuth (Algolia) | Pass, no AI call |
| J4 fake app | Pass, scenario H lists what was checked |
| J5 Pipedrive own app | Pass |
| J6 shared link | Pass (no login; assumptions shown) |
| J7 agent JSON/Markdown | Pass |
| J8 demo < 8 min on prod | **Not run, needs deploy** |

## 9. Remaining work, with everything needed to finish

### 9a. Three more library guides (step 7 — completed; original notes below)
Write `data/guides/<slug>.json` in the same shape as `github.json`, then `npm run validate -- --fix-scenarios`, commit separately. Facts already gathered (all URLs return 200):

**Outlook** (`outlook`; Composio: OAUTH2 + S2S_OAUTH2, managed OAuth yes; redirect as above; default scopes include Calendars/Contacts/Chat/Mail/MailboxSettings + offline_access)
- Register at Microsoft Entra admin center → Entra ID → App registrations → New registration. Account types: Single tenant / Multiple Entra ID tenants / + personal Microsoft accounts. https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
- Publisher verification needs a verified Microsoft AI Cloud Partner Program account, an app registered with a work/school account (not personal), and a publisher domain that isn't *.onmicrosoft.com; free; "verified in minutes" once prerequisites are met. Since Nov 2020, with risk-based step-up consent, users can't consent to most new unverified multitenant apps. https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview
- By default users can consent to mailbox access; Microsoft recommends allowing user consent only for verified publishers; admins can disable it. https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent
- Composio FAQ: "Needs admin approval" means a tenant admin grants consent (App registrations → API permissions → Grant admin consent), then the original user reconnects; a verified publisher reduces friction but doesn't remove admin consent everywhere. https://docs.composio.dev/toolkits/outlook
- Suggested access: `reviewForCustomers: true` (publisher verification + tenant consent) → scenario D for customers.

**Notion** (`notion`; Composio: OAUTH2 managed + API_KEY)
- No OAuth scopes: users pick pages and databases in a page picker (only pages they have full access to). https://developers.notion.com/docs/authorization
- Public connection: add redirect URI(s); "The Authorization URL field populates after a public connection is submitted for review." Whether Notion actually reviews, and how long it takes, is **Unknown**.
- Composio FAQ: actions are attributed to the integration (shows "Composio" unless you use your own); reconnecting through the same app can invalidate older refresh tokens; own app means setting up webhook ingress yourself. https://docs.composio.dev/toolkits/notion
- Internal integrations (API key) suit a single workspace (team).

**Trello** (`trello`; Composio: OAUTH1 managed; fields consumer_key/consumer_secret; scopes read, write, account)
- OAuth 1.0 endpoints `https://trello.com/1/OAuthGetRequestToken`, `/1/OAuthAuthorizeToken`, `/1/OAuthGetAccessToken`; the API key is tied to a Power-Up: trello.com/apps/admin → your Power-Up → Trello Auth → Generate a new API Key; scopes read/write/account; token expiration 1hour/1day/30days/never. https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/
- Unknown: the callback/allowed-origins setup for Composio's redirect with OAuth 1.0.

### 9b. README (step 8 — completed)
Fill "Key decisions · Limitations · Verification" in `README.md` from §4, §6, §7 and §8 here. Include the model choice and its numbers (CLAUDE.md §12 asks for it), the free-tier limits, "share links are unlisted but public", and the roadmap (CLAUDE.md §13).

### 9c. `/verification` page (step 8 — completed)
A simple static page listing what was Tested (§7, with dates), what's sourced-only, guide statuses, and validator rules. It can read `data/guides/*.json` and show every `tested` evidence item.

### 9d. Deploy to Vercel (step 8; ask Nayana before creating anything)
1. Push to a GitHub repo (ask first) or deploy with `vercel` CLI from the folder.
2. Create the Vercel project and connect a **Blob store with access = Private** (Storage tab); Vercel adds `BLOB_READ_WRITE_TOKEN`.
3. Add env vars: `COMPOSIO_API_KEY`, `OPENROUTER_API_KEY`, `TAVILY_API_KEY`, `LLM_MODEL`, `LLM_PROVIDER=openrouter` (optionally `VISITOR_RUNS_PER_HOUR`). Never `ANTHROPIC_API_KEY`.
4. Hobby plan functions max out at 300 s; the generate route already sets `maxDuration = 300` and caps runs at 240 s.
5. On prod: run J1–J8 (CLAUDE.md §9 and §11). Before the demo, check OpenRouter quota (`GET https://openrouter.ai/api/v1/key`) and Tavily credits; regenerate demo live plans (Algolia, Zorblat) on prod.

### 9e. Small known issues
- Free-model plans can put a step in the wrong phase or list a non-approver as a gatekeeper (seen in HubSpot); they're labelled "Researched by an agent, not yet reviewed".
- A run whose stream dies stays "running" until the dedupe index expires (about 4.5 minutes).
- Google's consent screen name (your app vs composio.dev) wasn't captured in testing.
- `npm run lint` and `npm run build` were clean at the last commit.

## 10. Prompt to continue in a new session

> Read the latest-continuation section in HANDOFF.md and DEPLOYMENT.md. Local guides, verification page, README and checks are complete. Review existing user authorization before asking again; if deployment is not yet approved, show the local result and ask before creating the proposed Vercel project/private Blob store. Then configure the existing local service keys securely, deploy, and run the production acceptance checklist. Never print keys or push without authorization.
