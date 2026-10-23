# Production verification — 2026-10-23

Public app: [oauth-launch-navigator.vercel.app](https://oauth-launch-navigator.vercel.app).

The owner approved the Vercel deployment and completed CLI MFA. The new project runs on Hobby,
Node 22.x, Fluid compute and a Private Blob store connected to Production and Preview. Composio,
OpenRouter and Tavily keys are stored as Vercel Secrets. No GitHub repository, push, paid upgrade
or billing change was needed.

## Deployment checks

- Upload dry run: 77 source files; library guides and research skill/schema included. `.env*`,
  `.data/`, `.vercel/`, Git metadata and build/dependency output excluded.
- Production configuration and all seven guide validations passed in Vercel's build.
- Initial build exposed Blob SDK time access while prerendering. `getPlan()` now awaits Next's
  `io()` before reading live storage; library guides remain static. A build using production Blob
  credentials and the subsequent cloud build both passed.
- HTTP smoke checks passed from an unauthenticated client: all 63 guide/input combinations,
  evidence references, Gmail assessment filtering, Notion's empty scopes, Markdown, shared pages,
  missing guide, cached generation and invalid input. The tests consumed no AI credits.

## Live generation and persistence

These were fresh production runs, not uploaded local cached plans. Completion timings include the
initial request, stream and result/cache checks. First progress is measured from the initial POST,
including run creation and SSE setup.

| App | First progress | Complete | Outcome |
| --- | --- | --- | --- |
| HubSpot | 2.085s | 87.184s | Scenario B; generated with dots-3; 8 steps, 10 evidence entries, 3 unknowns |
| Algolia | 1.523s | 3.692s | Scenario F; 4 steps; built from API facts without an AI call |
| Zorblat CRM | 1.494s | 3.927s | Scenario H; no steps invented; five searches and missing toolkit reported; no AI call |

All three plans were retrieved from private Blob through the public plan API, and subsequent
POSTs returned `cached: true`. HubSpot used the configured free model. Its source URLs and unknowns
were inspected; the plan remains unreviewed provider guidance, not a successful provider setup test.

**Timing caveat:** HubSpot's cold first progress narrowly exceeded the <2-second target by 85ms.
The full-plan timing and demo targets passed. Three runs do not establish p50/p95 performance.

## Journeys

| Journey | Result |
| --- | --- |
| J1 | Gmail found through catalog search; read shows assessment, write removes it; step 4 Markdown copied; share link retains write/customers |
| J2 | Fresh HubSpot research emits stages and builds a sourced plan; completion and persistence pass; cold first-progress caveat above |
| J3 | Algolia API-key scenario F and no model call verified |
| J4 | Fictional app scenario H, zero steps and explicit checks verified; approval summary corrected to Unknown |
| J5 | Pipedrive stays C and offers no managed path |
| J6 | Public HTTP access works without login; copied link opens the same assumptions in a new tab |
| J7 | JSON/Markdown and owner guidance pass all input combinations; agents are told to stop for user-owned steps |
| J8 | Browser walkthrough including the live run completed in **176 seconds (2m 56s)**, below 8 minutes |

The walkthrough covered Gmail → GitHub → Slack → Pipedrive → HubSpot → fictional app → Algolia.
The original Google/GitHub OAuth setup tests remain separate dated evidence. Owner review of guide
content is still pending; application testing does not mark a provider guide Verified.

The machine-readable observations are in `data/verification.json` and the public `/verification` page.

## Completion checks and screenshot walkthrough — 23 October 2026

- A fresh Airtable run outside the catalog completed and saved a generated guide with seven steps, six evidence entries and six explicit unknowns. The page and JSON export were retrieved afterward. This verifies live generation/storage, not successful Airtable registration or approval.
- Before that retry, the visitor's hourly allowance produced a labelled starter with confirmed Composio toolkit facts and a direct source link. Retrying after the allowance returned upgraded that starter. Screenshots preserve both states; the starter screenshot is historical.
- Browser navigation exposed a stale generation screen on repeated starts. Research CTAs now use fresh document navigation; startup requests have a 30-second timeout and a cancellation signal.
- Deterministic failure checks pass for AI quota, search/extraction throttling, Composio outage, failed repair, starter cooldown/upgrade, busy requests, API-key guidance at zero AI quota, visitor-slot refunds and the actual SSE cancellation handler. These use fixtures and no API credits.
- Library validation, lint, TypeScript and the production-configured build pass. The public smoke suite passed all 63 library/input views plus evidence references, Markdown, shared pages, caching and invalid requests.
- The owner selected screenshots instead of video. `/demo` and `docs/walkthrough.md` show the actual guide flow. The home illustration now explains search → choices → guide; the optional provider/Composio diagram appears only beside custom configuration instructions and describes future setup, not an integration this prototype runs.

Generated provider guidance remains unreviewed. In particular, Airtable's registration details, scope classification and approval policy remain among the open questions; the screenshot is not a certification of those requirements.
