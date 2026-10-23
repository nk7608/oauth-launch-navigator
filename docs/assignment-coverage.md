# Assignment coverage

Based on the [Composio APM Integrations take-home](https://composio.notion.site/APM-Integrations-Take-home-Assignment-3f9f261a6dfe81489ee5e3643151f9d6), read on 23 October 2026.

The brief permits a focused slice with a few varied guides and live generation. It does not require all 100 written guides, paid accounts, completed provider approvals, or production readiness.

| Assignment outcome | Implementation and evidence | Remaining limit |
| --- | --- | --- |
| Find an app and make progress | 100 synced catalog entries; seven ready guides; ordered steps and a concrete next action | Other entries need live research |
| Explain difficulty, effort, waits and gatekeepers | Plan verdict, effort/wait/approval summary, scope table, inline blockers | Unknown durations stay Unknown |
| Distinguish provider registration, Composio integration and per-user connection | Separate registration/connect/approval phases, managed testing path, small contextual diagrams | App does not perform provider registration for the visitor |
| Clear human/agent handoff | Step ownership, copyable values and Markdown/JSON exports | Login, terms, consent, payment and submissions require the person |
| Investigate and attempt setup | Dated Tested evidence in Gmail and GitHub records | No claim of completed provider approval |
| Use findings to correct guidance | Gmail test-user and partial-consent blockers; send-only assessment distinction; GitHub organization access separated from registration | Observations apply to those accounts and conditions |
| Varied real examples | Gmail, GitHub, Slack, Pipedrive, Outlook, Notion, Trello | Five of seven are research-only; none newly marked Verified |
| Unfamiliar app input | Fixed live retrieval, AI synthesis, source validation, SSE progress, cancellation, storage | Providers can throttle; ambiguous apps may return insufficient information |
| Handle missing/incorrect information honestly | Explicit evidence labels, unknowns, fake-app zero-step path, partial starters on service failures | Structural validation cannot establish factual truth |
| Shareable useful output | Public plan links preserve choices; step/plan copy and agent exports | No private-user access control |
| Working submission and concise explanation | Live Vercel app, public GitHub source, walkthrough README, screenshot walkthrough | Free quotas and best-effort serverless locks suit a demo |

## What was actually checked

- `npm run validate`: all seven guide records, evidence references, routing and known-fact checks.
- `npm run smoke`: all 63 library/input combinations plus exports, shared pages, caching and invalid requests, without new research calls.
- `npm run test:fallback`: controlled fixtures for model quota, search/extraction throttles, Composio outage, unknown apps, cooldown/upgrade and visitor-slot behavior. These are failure simulations, not claims that a provider outage was induced in production.
- Recorded production research: HubSpot (87.2 seconds), Algolia API-key path (3.7 seconds), fictional app (3.9 seconds). See [the production record](../PRODUCTION_VERIFICATION.md).
- Provider setup observations and their conditions are in `data/guides/gmail.json` and `data/guides/github.json`; the web guide surfaces them as Tested evidence.

The historical model comparison chose dots-3 over the free alternatives tried. Its numerical benchmark files were not handed over, so it is not presented as a rigorous benchmark. The small production timing sample also cannot establish p50/p95 performance.
