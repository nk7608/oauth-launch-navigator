# OAuth Launch Navigator

Tell it the app and what your AI agent does. Get a sourced, step-by-step plan to set up your own
OAuth app, get it approved, and connect it to Composio.

## What it does
Turns scattered provider and Composio documentation into one short launch plan per app: what to do,
in what order, who must approve, how long it may take, and what will block you. Every step shows
its source and how confident we are (Official · Reported · Tested · Inferred · Unknown).

## How it works
1. Pick an app from the 100-app catalog, or type any app name or website.
2. Answer two questions: what your agent will do, and who will connect accounts.
3. Get a step-by-step plan. It updates instantly when your answers change.
   Apps outside the library are researched live by an agent.

## Scenarios covered
Ready to use with Composio · switching to your own app · own app required · review required ·
gated access · not OAuth · not in Composio yet · not enough reliable info.

## For agents
Every plan is available as Markdown and JSON at a stable URL. "Agent can do" steps are automatable;
"You do" steps need a human (sign-in, terms, submission).

## Setup
1. `cp .env.example .env.local` and add `COMPOSIO_API_KEY`, `OPENROUTER_API_KEY`, `TAVILY_API_KEY`.
2. `npm install && npm run dev`

## Runs on free tiers
Library plans are researched ahead of time and stored in the repo. Live plans use OpenRouter free models
(about 2 AI calls per plan) and Tavily's free search plan. The AI provider is one setting (`LLM_PROVIDER`),
so a paid model can be swapped in without code changes.

## Key decisions · Limitations · Verification
_To be filled during the build (see CLAUDE.md §10 step 7)._

## Roadmap
Next: follow-up questions, plans from your Composio tools, review kit, multi-app plans.
Later: pre-launch check, change alerts, approval tracker, freshness monitor, community-confirmed
steps, Composio dashboard integration and MCP access.
