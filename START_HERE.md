# Start here

1. Unzip this folder somewhere on your computer.
2. Create free accounts/keys: Composio (new key — replace the old one), OpenRouter (openrouter.ai → Keys),
   Tavily (app.tavily.com).
3. In this folder: copy `.env.example` to `.env.local` and paste the three keys there yourself.
   Do not set ANTHROPIC_API_KEY anywhere.
4. Open the Claude desktop app → Code tab → open this folder.
5. Paste this as your first message:

> Read CLAUDE.md and the oauth-guide-research skill. We're building OAuth Launch Navigator on free tiers
> (Claude Code for library plans, OpenRouter free models + Tavily for live plans).
> Start with Build order step 0: check the three keys from .env.local without printing them, list
> OpenRouter :free models that support JSON output and test 2–3 against data/guides/gmail.json,
> inspect the Composio Playground with Claude in Chrome (I'll sign in), and regenerate data/apps.json
> from the Composio API. Then show me what you found and your plan for step 1 before writing code.
> Ask me if anything is unclear.
