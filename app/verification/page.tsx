import type { Metadata } from "next";
import Link from "next/link";
import { BookCheckIcon, CircleHelpIcon, FlaskConicalIcon, LightbulbIcon, RadarIcon, TagIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "What we checked",
  description: "What we tested ourselves, what official sources support, and what is still uncertain.",
};

const LESSONS = [
  "Composio's default Gmail scopes include full mailbox access, which triggers Google's strictest review. The guide now tells you to replace them with the one scope your agent needs.",
  "In Testing mode only listed test users can sign in. The guide shows where to add them.",
  "Users can untick permissions on Google's consent screen, so a connection can be active without Gmail access. The guide adds a step to check granted scopes.",
  "New Google client settings can take minutes to hours to apply. The guide says to wait before changing anything.",
  "Your own OAuth app doesn't remove every “Composio” label users see. The guide adds a white-labelling step.",
];

const GUIDES = [
  ["gmail", "Gmail", "read vs send-only changes the review and security assessment."],
  ["github", "GitHub", "registering the app and getting an organisation's approval are separate steps."],
  ["slack", "Slack", "testing in your workspace differs from public distribution."],
  ["pipedrive", "Pipedrive", "no Composio-managed app, so your own app is needed from day one."],
] as const;

const LABELS = [
  ["Official", "provider or Composio docs", "bg-ev-official"],
  ["Reported", "a named third party", "bg-ev-reported"],
  ["Tested", "we did it ourselves", "bg-ev-tested"],
  ["Inferred", "our reasoning from official facts", "bg-ev-inferred"],
  ["Unknown", "not established", "border border-dashed border-ev-unknown"],
] as const;

export default function VerificationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-[30px] leading-tight font-semibold tracking-tight">What we checked</h1>
      <p className="mt-3 max-w-[64ch] text-muted-foreground">
        The assignment asks us to show what we tested, what sources support, and what is still uncertain. Checked 23 October 2026.
      </p>

      <div className="mt-8 space-y-4">
        <Block icon={<FlaskConicalIcon />} title="We set up real OAuth apps">
          <ul className="space-y-1.5">
            <li>
              <Link href="/plan/github" className="font-medium text-primary hover:underline">GitHub</Link>: registered an OAuth app, connected it to Composio
              with a custom auth config, connected an account and ran a read tool.
            </li>
            <li>
              <Link href="/plan/gmail" className="font-medium text-primary hover:underline">Gmail</Link>: created a Google OAuth client in Testing mode and
              ran the connection flow through Composio.
            </li>
          </ul>
        </Block>

        <Block icon={<LightbulbIcon />} title="What those tests taught us (now in the guides)">
          <ul className="list-disc space-y-1.5 pl-5">
            {LESSONS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Block>

        <Block icon={<BookCheckIcon />} title="Guides checked against official sources">
          <p className="mb-2">Each one shows a different path:</p>
          <ul className="space-y-1.5">
            {GUIDES.map(([slug, name, why]) => (
              <li key={slug}>
                <Link href={`/plan/${slug}`} className="font-medium text-primary hover:underline">{name}</Link>: {why}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            <Link href="/plan/outlook" className="text-primary underline underline-offset-2 hover:no-underline">Outlook</Link>,{" "}
            <Link href="/plan/notion" className="text-primary underline underline-offset-2 hover:no-underline">Notion</Link> and{" "}
            <Link href="/plan/trello" className="text-primary underline underline-offset-2 hover:no-underline">Trello</Link> also have sourced guides.
          </p>
        </Block>

        <Block icon={<RadarIcon />} title="Live research works on apps we never prepared">
          <ul className="space-y-1.5">
            <li><span className="font-medium">HubSpot</span>: a sourced plan in 87 seconds.</li>
            <li><span className="font-medium">Algolia</span>: correctly identified as API-key only, with no OAuth steps.</li>
            <li><span className="font-medium">A made-up app</span>: returned &ldquo;not enough reliable information&rdquo; with no invented steps.</li>
          </ul>
          <p className="mt-2 text-muted-foreground">If free AI or search limits run out, saved guides still open and a labelled starter plan is shown.</p>
        </Block>

        <Block icon={<CircleHelpIcon />} title="Not yet verified">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>No provider approval (Google, Slack Marketplace, etc.) has been completed.</li>
            <li>Only GitHub and Gmail had hands-on setup tests; the other guides rely on sources.</li>
            <li>Live-generated guides are not human-reviewed.</li>
            <li>Wait times are the providers&apos; own estimates or named third-party reports.</li>
          </ul>
        </Block>

        <Block icon={<TagIcon />} title="How to read the labels">
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {LABELS.map(([name, meaning, dot]) => (
              <li key={name} className="flex items-center gap-2">
                <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${dot}`} />
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground">{meaning}</span>
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </div>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-4 rounded-xl border bg-card p-5">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-[18px]">
        {icon}
      </span>
      <div className="min-w-0 text-[15px] leading-relaxed">
        <h2 className="mb-2 text-[17px] font-semibold">{title}</h2>
        {children}
      </div>
    </section>
  );
}
