import type { Metadata } from "next";
import Link from "next/link";
import { ScreenshotWalkthrough } from "@/components/screenshot-walkthrough";

export const metadata: Metadata = { title: "Demo walkthrough", description: "Follow Scopewise from search to a sourced guide, live research, sharing and the quota fallback." };
export default function DemoPage() {
  return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <Link href="/" className="text-sm text-primary hover:underline">← Try the app</Link>
    <h1 className="mt-4 text-[30px] leading-tight font-semibold tracking-tight">See the whole flow in eight screens</h1>
    <p className="mt-3 max-w-3xl text-muted-foreground">Real screenshots of Scopewise, from finding an app to a sourced plan, live research and the fallback when free limits run out. Browsing them uses no research credits.</p>
    <ScreenshotWalkthrough />
    <div className="mt-8 flex flex-wrap gap-5 text-sm text-primary underline">
      <a href="https://github.com/nk7608/oauth-launch-navigator/blob/main/docs/demo/transcript.md">All screenshots and captions on GitHub</a>
      <Link href="/verification">What we checked</Link>
    </div>
  </div>;
}
