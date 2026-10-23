# OAuth Launch Navigator

Tell it an app and what your AI agent does. Get a sourced plan to register your own OAuth app,
handle approval, and connect it to Composio: the order, who acts, waits, blockers and permissions.

## Run locally

Use Node.js 22. The downloaded folder name ends in a space, so quote its path.

```bash
cd "/Users/nayana/Downloads/oauth-launch-navigator "
npm ci
cp .env.example .env.local  # only if .env.local does not already exist
# Add the three keys in a local editor; never paste them into chat.
npm run check-keys
npm run check-deploy
npm run dev
```

Open [localhost:3000](http://localhost:3000). Existing keys are in the ignored `.env.local`.
Do not overwrite that file or configure `ANTHROPIC_API_KEY`.

| Setting | Purpose |
| --- | --- |
| `COMPOSIO_API_KEY` | Toolkit authentication facts; tool execution permission is unnecessary |
| `OPENROUTER_API_KEY` | Live plan generation |
| `TAVILY_API_KEY` | Live search and extraction |
| `LLM_PROVIDER` | `openrouter`, the implemented backend |
| `LLM_MODEL` | Defaults to `dots-studio/dots-3-note-preview:free` |
| `LLM_FALLBACK_MODELS` | Optional comma list; defaults to `recursive/flint-v1.0:free` when unset |
| `VISITOR_RUNS_PER_HOUR` | Positive integer; defaults to 3 |
| `BLOB_READ_WRITE_TOKEN` | Required on Vercel; connect a **Private** Blob store |

## Use it

1. Search the 100-app catalog by name or website, or enter an app outside it.
2. Choose read, write or both, and whether you, your team or customers will connect.
3. Follow the plan, copy a step, or share the URL. Changing answers uses fixed rules and no new AI call.

Seven guides are stored in the repository: Gmail, GitHub, Slack, Pipedrive, Outlook, Notion and Trello.
Other catalog entries are researched when requested; the catalog is not 100 prewritten guides.
The eight scenarios cover managed testing, switching to your app, own app required, review, gated
access, non-OAuth authentication, missing Composio support and insufficient information.

**Share links are public.** Live-plan links are unlisted but accessible to anyone who has or guesses
the URL. There are no accounts or access controls. Do not put confidential information in a query.
Step progress stays in the current browser's localStorage and is not shared with recipients.

## Agent access

```text
GET /api/plan/gmail.json?does=write&users=customers
GET /api/plan/gmail.md?does=write&users=customers
POST /api/generate                   body: {"query":"app name or website"}
GET /api/generate/<runId>            Server-Sent Events
```

JSON and Markdown use the page's assumptions, scenario and step ordering. Agents stop at steps
owned by `you`; login, terms, payment and submissions need the user. Stored guides require no live
research call. Closing the generation stream cancels that attempt.

## Key decisions

- Scenarios come from code. Composio API facts overwrite model guesses; toggles cover all nine
  capability/audience combinations without new research.
- Research runs once per app: five basic Tavily searches and up to nine extracts feed one build
  completion, plus one repair completion if needed. A provider retry can add HTTP attempts.
- Every claim is Official, Reported, Tested, Inferred or Unknown. Failed repairs preserve supported
  content as a partial plan. Validators check structure and consistency, not factual truth.
- The SSE request runs the pipeline with a 240-second cap and a 300-second function setting;
  no separate background worker is required.
- Local runs use ignored `.data/` JSON. Vercel uses private Blob objects. Missing Blob credentials
  fail the deployment check, and runtime writes cannot fall back to the deployment filesystem.
- The Composio Playground tests the actual connection and tools. This app never requests a provider
  client secret or executes the user's tools.

## Model choice and measured results

The handoff's Gmail comparison selected `dots-studio/dots-3-note-preview:free`: schema-valid output,
correct Gmail scope tiers and no invented URLs. `recursive/flint-v1.0:free` was weaker and remains
the fallback. Other candidates hit upstream rate limits or timed out. The comparison was small;
full numerical score files are not included, so this is not a benchmark across providers.

Recorded live runs took **117 seconds (HubSpot)** and **115 seconds (Rippling)** after limiting prompt
and output size; an earlier attempt took 210 seconds. These are two observations, not measured p50/p95
statistics. Targets remain p50 ≤120 seconds and p95 ≤200 seconds. On 2026-10-23 both configured models
were still listed with JSON output and zero prompt/completion pricing.

## Free-tier limits and limitations

- OpenRouter free models allow 20 requests/minute and, without the qualifying credit purchase,
  50 requests/day. At two completions per plan, budget about 25 plans/day; retries and other usage
  reduce that. The app reads `free_model_daily_requests.remaining`, not the monetary `limit_remaining`.
  See [OpenRouter limits](https://openrouter.ai/docs/api_reference/limits).
- Tavily includes 1,000 credits/month. Five basic searches plus nine successful basic extractions
  cost about seven credits per plan, or roughly 140/month. See [Tavily credits](https://docs.tavily.com/documentation/api-credits).
- Vercel Hobby and Blob also have quotas; this is a small demo, not an unlimited free service.
  See [Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing).
- The IP-based visitor cap is shared on shared networks. Concurrency and dedupe use read/modify/write
  records rather than atomic locks; serverless instances can race. Limits are best effort, not a
  spending guarantee.
- Free providers throttle or become unavailable. A model may choose a wrong phase or gatekeeper
  despite validation. Inspect evidence and unknowns before using a plan for launch.
- A disconnected run can remain active until its approximately 4.5-minute expiry. The hard run cap
  returns an error; validator failure after repair can save a partial plan. Timeout salvage is not implemented.
- Gmail and GitHub have recorded setup tests. The other five guides have not been tested end to end.
  Owner review is pending; no guide has been newly marked Verified.
- Notion's review wording conflicts across its docs. Trello documents OAuth 2.0, but Composio uses
  OAuth 1.0, whose custom callback setup remains untested.
- Local `.data/` plans are not uploaded. Regenerate desired live examples on production.

## Verify

```bash
npm run validate                     # records, evidence references, routing, known facts
npm run lint
npm run check-deploy                 # local configuration; no API requests
npm run check-deploy -- --production # additionally requires Blob credentials
npm run build
npm start                            # localhost:3000
# In a second terminal:
npm run smoke                        # HTTP checks; no live research credits spent
npm run smoke -- https://your-deployment.vercel.app
```

Smoke checks cover all 63 guide/input combinations, Gmail's send-only assessment change, Notion's
empty OAuth scopes, Markdown, shared pages, evidence references, cache hits and invalid requests.
They also check the free-request counter and missing-Blob guard. Browser interaction, live research
and the timed demo require separate checks. The [verification page](http://localhost:3000/verification)
shows all dated Tested findings, source-only coverage, guide statuses and validator rules.

For guide content, follow [.claude/skills/oauth-guide-research/SKILL.md](.claude/skills/oauth-guide-research/SKILL.md),
run `npm run validate -- <slug> --fix-scenarios`, and commit each guide's corrections separately.

## Deploy

`vercel.json` runs validation and the production configuration check before building. Follow
[DEPLOYMENT.md](DEPLOYMENT.md) for private Blob, environment variables and the J1–J8 checklist.
The handoff requires approval before creating Vercel resources or pushing to GitHub. A local build
does not imply deployment.

## Roadmap

Next: follow-up questions from plan sources; plans from your Composio tools; a review kit with scope
justifications, demo script and privacy-policy checklist; multi-app plans; a paid-model switch for
higher-quality live research.

Later: local pre-launch check, change alerts, approval tracker, freshness monitor, community reports,
Composio dashboard integration and MCP access.
