import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What we checked | OAuth Launch Navigator",
  description: "Real setup attempts, varied guides, live research, and what remains unverified.",
};
const examples = [
  ["gmail", "Gmail", "Read vs send-only scopes change the review and assessment requirements."],
  ["github", "GitHub", "OAuth registration and organization approval are separate steps."],
  ["slack", "Slack", "Workspace testing differs from public marketplace distribution."],
  ["pipedrive", "Pipedrive", "Registering your own app and connecting it through Composio."],
];
export default function VerificationPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <Link href="/" className="text-sm text-primary hover:underline">← App catalog</Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">What we checked</h1>
        <p className="mt-3 text-muted-foreground">The assignment asks for varied guides, useful live research, and a clear distinction between tested findings and uncertainty. Checked 23 October 2026.</p>
      </header>
      <section className="rounded-lg border p-5">
        <h2 className="text-lg font-semibold">Real setup attempts</h2>
        <p className="mt-3 text-sm leading-relaxed"><Link href="/plan/github" className="text-primary underline">GitHub:</Link> registered an OAuth app, created a custom Composio auth config, connected an account, and ran a read tool.</p>
        <p className="mt-3 text-sm leading-relaxed"><Link href="/plan/gmail" className="text-primary underline">Gmail:</Link> tested the connection flow. A test-user error and partially granted permissions exposed blockers; the guide records the fixes and the scope distinction.</p>
        <p className="mt-3 text-sm text-muted-foreground">These dated observations are linked in each guide’s sources. They do not establish that every scope or customer setup works.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Different paths, checked against sources</h2>
        <ul className="mt-3 divide-y rounded-lg border">
          {examples.map(([slug, name, detail]) => <li key={slug} className="p-4 text-sm"><Link href={`/plan/${slug}`} className="font-medium text-primary hover:underline">{name}</Link><p className="mt-1 text-muted-foreground">{detail}</p></li>)}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">Outlook, Notion and Trello also have sourced guides. Seven guides cover a focused slice of the 100-app catalog; the assignment does not require all 100 to be written.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Live research and sharing</h2>
        <p className="mt-3 text-sm leading-relaxed"><Link href="/plan/hubspot" className="text-primary underline">HubSpot</Link> produced a sourced plan in 87 seconds. <Link href="/plan/algolia" className="text-primary underline">Algolia</Link> took the API-key path without AI. A <Link href="/plan/zorblat-crm" className="text-primary underline">fictional app</Link> returned insufficient information with no invented steps. Saved plans, shared links and agent exports were checked.</p>
        <p className="mt-3 text-sm leading-relaxed">Library and saved guides stay available when generation is limited. If search or AI is unavailable, a labelled starter preserves available facts and sources; full research can be retried later.</p>
        <Link href="/demo" className="mt-3 inline-block text-sm text-primary underline">See the screenshot walkthrough →</Link>
      </section>
      <section className="rounded-lg border bg-muted/30 p-5">
        <h2 className="font-semibold">What remains unverified</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Owner review is pending. The other five library guides have no recorded end-to-end setup test, and generated guides remain unreviewed. Provider approvals have not been completed. Unknown scopes, waits and conflicting requirements stay visible in each guide.</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Official = provider or Composio docs. Reported = a named third party. Tested = an observed setup attempt. Inferred = reasoning. Unknown = not established.</p>
      </section>
      <a href="https://github.com/nk7608/oauth-launch-navigator" className="text-sm text-primary hover:underline">Source, setup and detailed checks on GitHub ↗</a>
    </div>
  );
}
