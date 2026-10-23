# Deployment and acceptance checklist

**Deployed with owner approval on 2026-10-23:** [oauth-launch-navigator.vercel.app](https://oauth-launch-navigator.vercel.app).
Project `oauth-launch-navigator` in `nk7608s-projects`; Blob `store_rISLkokuIn5Ux1Y0` is Private and
connected to Production and Preview. Node 22.x and Fluid compute are enabled. The three service
keys are Vercel Secrets; model and visitor settings are configured. No GitHub push or paid upgrade
was used. Functional production checks and the timed walkthrough completed; see
[PRODUCTION_VERIFICATION.md](PRODUCTION_VERIFICATION.md). The preparation record below is historical.

Prepared 2026-10-23. The signed-in Vercel team is `nk7608s-projects` (Hobby). Searching its projects
for `oauth` returned no results; Storage showed no stores. This folder has no `.vercel` link,
Git remote or installed Vercel CLI. These observations agree with HANDOFF.md: deployment was not
started. Nothing was created or pushed during the check.

## Proposed resources — owner approval required

1. Vercel project `oauth-launch-navigator` under `nk7608s-projects`, Next.js, Node 22.x.
2. Blob store `oauth-launch-navigator`, with **Private** access, connected only to that project.
3. Either a CLI deployment from this folder (no GitHub repository needed), or an approved private
   GitHub repository and push. Private source does not make the site private.
4. Public site URL for shared plans and the evaluator. No paid upgrade, domain purchase or billing
   change is included. If the account demands one, stop and ask the owner.

HANDOFF.md §9d says to ask before creating anything in Vercel; §4 says not to push without asking.
Complete local checks before requesting deployment approval.

## Configure the project

- Next.js framework; build command from `vercel.json`; install using the package lock.
- Node 22.x, matching `package.json` and the tested local runtime.
- Create a **Private** Blob store and connect it to Preview and Production. Vercel supplies
  `BLOB_READ_WRITE_TOKEN`; no token belongs in source control or chat.
- Securely add the existing `COMPOSIO_API_KEY`, `OPENROUTER_API_KEY`, `TAVILY_API_KEY` to this project.
  Never prefix them with `NEXT_PUBLIC_` or use another project's environment.
- Set `LLM_PROVIDER=openrouter`, `LLM_MODEL=dots-studio/dots-3-note-preview:free`, optionally
  `LLM_FALLBACK_MODELS=recursive/flint-v1.0:free` and `VISITOR_RUNS_PER_HOUR=3`.
- Do not configure `ANTHROPIC_API_KEY`. The deployment check rejects paid model IDs for this setup.
- Confirm the store's Private setting in the dashboard. The check verifies token presence, not
  access mode or storage health; test read/write persistence with a generated plan after deployment.
- The SSE route exports `maxDuration=300`, with a 240-second pipeline cap. Use Fluid compute and
  confirm that the account's duration setting accommodates it.
- `.vercelignore` excludes keys, local plans, Git metadata, dependencies and build output from CLI
  uploads. Keep `.claude/skills/` in the source upload; it is part of the live research prompt.

After approval, use the official Vercel CLI, sign in to the intended account, link the explicitly
named project, then deploy. Do not infer the project name from this folder's trailing space. For a
Git deployment, create/push only the approved repository and import it. Do not use a portfolio repo.

## Production acceptance

First run `npm run smoke -- https://<deployment-host>`; it does not start paid or free live research.
Then run these manually and record actual evidence:

| Journey | Pass when |
| --- | --- |
| J1 | Gmail loads; send-only removes the assessment; copy a step and reopen the same choices from a share link |
| J2 | A real app absent from the library shows progress within 2 seconds and completes within 240 seconds; claims and unknowns inspected |
| J3 | Algolia produces non-OAuth scenario F and a short API-key path without a model completion |
| J4 | A fictional app produces H, lists what was checked and invents no setup guide |
| J5 | Pipedrive stays own-app-required (C), without a managed path |
| J6 | A shared link opens without login and shows readable assumptions and steps |
| J7 | JSON and Markdown match the page; owners/evidence exist and agents stop for the user |
| J8 | Gmail → GitHub → Slack → Pipedrive → live app → fake/non-OAuth in under 8 minutes |

Check free requests and Tavily credits before the demo. Do not mark these passed until they run on
the deployed URL. Confirm a newly generated plan persists through Blob on subsequent requests;
local `.data/` is not deployed. Avoid repeating successful live tests without a change to verify.

Owner review of Gmail, GitHub, Slack and Pipedrive remains pending. Test resources listed in
HANDOFF.md §7 remain in the provider accounts; deleting them is a separate decision.

## Official references

- [Vercel Blob SDK and private access](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [Blob quotas](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [OpenRouter request and credit counters](https://openrouter.ai/docs/api_reference/limits)
