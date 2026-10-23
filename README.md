# OAuth Launch Navigator

An independent take-home prototype that turns an app name into a sourced OAuth setup guide: what to register, which permissions matter, who must act, what can block launch, and what to do next.

It uses Composio's catalog and API for authentication facts. The Composio connection steps describe what a developer could set up after following a guide. This prototype researches and explains that process; it does not run visitors' agents or connect their accounts. The recorded Gmail and GitHub setup attempts were assignment tests.

**[Try the app](https://oauth-launch-navigator.vercel.app/)** · **[Screenshot walkthrough](https://oauth-launch-navigator.vercel.app/demo)** · **[What we checked](https://oauth-launch-navigator.vercel.app/verification)**

## Walk through the app

1. **Find an app.** Search by name or website. The catalog has 100 entries and seven ready guides; other apps can be researched live.
2. **Choose access and audience.** Pick Read, Write, or Not sure, then Just me, My team, or Customers. These choices update the guide without another AI call.
3. **Follow the next action.** Read the ordered steps, copy instructions, check the sources and unknowns, or share a link that preserves your choices. JSON and Markdown support an agent handoff.

[![The app catalog and its find → choose → guide workflow](public/demo/catalog.jpg)](https://oauth-launch-navigator.vercel.app/demo)

Gmail shows why the choices matter. Read access for customers includes restricted scopes; send-only access removes the restricted-scope assessment step.

| Read access | Send-only access |
| --- | --- |
| ![Gmail read access](public/demo/gmail-read.jpg) | ![Gmail send-only access](public/demo/gmail-send.jpg) |

**[See all eight screenshots with captions](docs/walkthrough.md)** for the complete flow: choices → next action → evidence → live research → saved result → quota fallback. These are real app captures, available even if live research is limited.

## What the assignment covers

The original brief permits a few varied guides and a working live-generation flow. It does not require all 100 guides or completed provider approvals.

| Requested outcome | Included |
| --- | --- |
| Useful setup guidance | Steps, permissions, effort, waits, approvers, blockers, next action, and human/agent ownership |
| Varied apps and live research | Gmail, GitHub, Slack, Pipedrive, Outlook, Notion, Trello; saved live HubSpot and Airtable examples; API-key and unknown-app paths |
| Evidence and practical learning | Dated Gmail/GitHub setup findings, source labels, explicit unknowns, public sharing and exports |
| Working submission | Public app and source, local setup, screenshot walkthrough and verification notes |

See [assignment coverage](docs/assignment-coverage.md) for the requirement-by-requirement mapping. Generated guides remain unreviewed; no provider approval is implied.

## Run locally

Use **Node.js 22**.

```bash
git clone https://github.com/nk7608/oauth-launch-navigator.git
cd oauth-launch-navigator
npm ci
cp .env.example .env.local
# Add your keys using your editor.
npm run dev
```

Open [localhost:3000](http://localhost:3000). Ready guides work without keys. Live research needs `COMPOSIO_API_KEY`, `OPENROUTER_API_KEY`, and `TAVILY_API_KEY`. Keep them server-side in the ignored `.env.local`.

`.env.example` documents the free model choices and visitor limit. Local live plans use ignored `.data/` files. On Vercel, connect a **Private Blob** store for `BLOB_READ_WRITE_TOKEN` and add the service keys as environment secrets. Follow [deployment setup](DEPLOYMENT.md).

## How it works

- **Facts before prose:** Composio supplies toolkit/authentication facts. Five provider searches and up to nine extracts feed one AI completion, with one repair completion if needed.
- **Rules choose the path:** capability and audience select eight scenarios in code. Changing choices spends no research credits; exports use the same view as the page.
- **Evidence stays visible:** Official, Reported, Tested, Inferred and Unknown labels distinguish sources from observations. Validation checks structure and consistency, not factual truth.
- **Clear handoff:** a person handles login, consent and submissions. Steps marked Agent can do describe work a coding agent could help with; this site does not execute that work.

The app uses Next.js, React, Tailwind and shadcn components. The home visual explains this app's flow. A separate, optional OAuth diagram appears only beside the relevant custom configuration steps.

## When research is limited

Library and saved guides need no new research. Temporary model failures use configured alternative free models and one retry. If AI or search stays unavailable, a **labelled starter** keeps confirmed facts and source links; provider steps, scopes and approvals remain unknown. Retry can upgrade it later. Confirmed API-key guidance can be built without AI.

Full research is limited to three starts per hour per IP, two concurrent runs and four minutes per run. Busy/quota-blocked requests receive a starter. Failed, cancelled and starter-only attempts release their visitor slot; a five-minute starter cooldown avoids repeated failed calls. No paid model is enabled automatically. Switching models cannot bypass an account-wide quota.

## Check the implementation

```bash
npm run validate
npm run test:fallback   # simulated outages and quotas; no API credits
npm run lint
npm run check-deploy
npm run build
npm start
# In another terminal:
npm run smoke          # all 63 library/input combinations; no live research
```

Failure tests cover AI quota, search/extraction throttling, Composio outage, repair quota, starter reuse/upgrade, congestion, visitor limits and cancellation refunds. See [production checks](PRODUCTION_VERIFICATION.md) for live observations and timing caveats.

## Current limits

Gmail and GitHub have recorded setup attempts. The other five ready guides have no end-to-end setup test; owner review and provider approvals remain pending. Notion has conflicting review wording, and Trello's custom OAuth 1.0 setup remains untested. Live results can contain gaps or mistakes, so read their sources before launch.

Share links and exports are public, including unlisted live plans. Use public app names or websites in queries. Progress checkmarks stay in your browser. IP limits and Blob concurrency use best-effort records, so this is a demo rather than an abuse-resistant, unlimited service.
