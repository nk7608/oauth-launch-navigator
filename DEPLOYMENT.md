# Deploy your own copy

The public submission is [oauth-launch-navigator.vercel.app](https://oauth-launch-navigator.vercel.app/), with source at [nk7608/oauth-launch-navigator](https://github.com/nk7608/oauth-launch-navigator).

## Configure Vercel

1. Import your fork or deploy with the official Vercel CLI. Use Next.js and Node.js 22.
2. Create a **Private Vercel Blob** store and connect it to the project's deployment environments. Vercel supplies `BLOB_READ_WRITE_TOKEN`.
3. Add `COMPOSIO_API_KEY`, `OPENROUTER_API_KEY` and `TAVILY_API_KEY` as server-side environment variables.
4. Copy the non-secret model/provider/visitor settings from `.env.example`. Keep the `:free` model IDs for the free-tier setup. Do not add an Anthropic key; that backend is not implemented.
5. Deploy. `vercel.json` validates guides, checks production configuration and builds the app. The research route allows 300 seconds, with a 240-second pipeline cap.

Missing Blob credentials fail the production preflight. Runtime cannot write to the deployment filesystem as a fallback. Local `.env*`, `.data/`, Git metadata and dependencies are excluded from CLI uploads; research instructions remain included in the build trace.

## Verify the deployment

```bash
npm run smoke -- https://your-project.vercel.app
```

Then open Gmail, change Read to Write, copy/share the selected view, and research one new app. Confirm a saved live plan survives a redeployment. Check an API-key app and a fictional app. Read the returned sources and unknowns; a passing validator alone does not establish factual accuracy.

`npm run test:fallback` simulates provider outages and quota exhaustion without consuming credits. A labelled starter is expected when full research cannot run; the stored full guides and demo stay usable.

## Submission deployment

The owner's Vercel project uses a connected private Blob store and server-side secrets, and is connected to this GitHub repository: every push to `main` deploys to production, and other branches get preview deployments. `npx vercel deploy --prod` from a linked checkout still works for manual deploys.

No paid upgrade is needed to run the demonstrated slice. Provider free allowances, Vercel usage and Blob storage still have limits. The IP counter and active-run index are best effort, not atomic abuse controls.
