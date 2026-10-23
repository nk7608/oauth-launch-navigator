import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanViewLive, PlanViewStatic } from "@/components/plan/plan-view";
import { apps, getApp } from "@/lib/apps";
import { librarySlugs, loadGuide } from "@/lib/guides";
import { getPlan } from "@/lib/plans";

export function generateStaticParams() {
  return [...new Set([...librarySlugs(), ...apps.map((a) => a.slug)])].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/plan/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const name = loadGuide(slug)?.app.name ?? getApp(slug)?.name ?? (await getPlan(slug))?.app.name ?? slug;
  return { title: `${name} OAuth launch plan` };
}

export default function PlanPage({ params }: PageProps<"/plan/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-10 text-muted-foreground">Loading plan…</div>}>
      <PlanBody params={params} />
    </Suspense>
  );
}

async function PlanBody({ params }: { params: PageProps<"/plan/[slug]">["params"] }) {
  const { slug } = await params;
  // Library plans render statically; live plans come from the store at request time.
  const plan = loadGuide(slug) ?? (await getPlan(slug));
  if (!plan) return <NoGuideYet slug={slug} />;
  return (
    <Suspense fallback={<PlanViewStatic plan={plan} />}>
      <PlanViewLive plan={plan} />
    </Suspense>
  );
}

function NoGuideYet({ slug }: { slug: string }) {
  const name = getApp(slug)?.name ?? slug;
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold">No plan for {name} yet</h1>
      <p className="mt-2 text-muted-foreground">An agent can research {name} now and build a sourced plan. It takes about 2 minutes.</p>
      <a href={`/generate?q=${encodeURIComponent(name)}`} className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">
        Generate a plan for {name}
      </a>
    </div>
  );
}
