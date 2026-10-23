import type { Metadata } from "next";
import Link from "next/link";
import { ScreenshotWalkthrough } from "@/components/screenshot-walkthrough";

export const metadata: Metadata = { title: "Screenshot walkthrough | OAuth Launch Navigator", description: "Follow the real app from search to a sourced guide, live research, sharing and quota fallback." };
export default function DemoPage() {
  return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <Link href="/" className="text-sm text-primary hover:underline">← Try the app</Link>
    <h1 className="mt-4 text-3xl font-semibold tracking-tight">See the full guide flow</h1>
    <p className="mt-3 max-w-3xl text-muted-foreground">Eight real screenshots show how this independent assignment prototype helps you plan OAuth setup. Browse them without using any research credits.</p>
    <ScreenshotWalkthrough />
    <div className="mt-8 flex flex-wrap gap-5 text-sm text-primary underline">
      <a href="https://github.com/nk7608/oauth-launch-navigator/blob/main/docs/walkthrough.md">All screenshots and captions on GitHub</a>
      <Link href="/verification">What we checked</Link>
    </div>
  </div>;
}
