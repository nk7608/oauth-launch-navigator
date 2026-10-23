import { ArrowRightIcon, KeyRoundIcon, LayersIcon, ListChecksIcon, SearchIcon, SlidersHorizontalIcon, UserRoundIcon } from "lucide-react";

/** The home diagram describes this prototype's actual visitor flow. */
export function GuideFlow() {
  return <figure className="rounded-lg border bg-muted/20 p-4 text-sm" aria-label="How to use this guide">
    <div className="flex items-center justify-between gap-2 text-center" aria-hidden="true">
      <Node icon={<SearchIcon />} label="Find an app" />
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      <Node icon={<SlidersHorizontalIcon />} label="Choose access & audience" />
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      <Node icon={<ListChecksIcon />} label="Follow the sourced guide" />
    </div>
    <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">Find an app, choose what access you need and who will connect, then follow the sourced guide. Use it to plan setup before completing the steps in the provider&apos;s dashboard.</figcaption>
  </figure>;
}

/** Only appears beside custom OAuth configuration instructions, not on the home page. */
export function OAuthSetupDiagram() {
  return <figure className="rounded-lg border bg-muted/20 p-4 text-sm">
    <div className="flex items-center justify-between gap-2 text-center" aria-hidden="true">
      <Node icon={<KeyRoundIcon />} label="Provider OAuth app" />
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      <Node icon={<LayersIcon />} label="Composio auth config" />
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      <Node icon={<UserRoundIcon />} label="Each user approves access" />
    </div>
    <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">For a developer following this guide: register an OAuth app with the provider, add its client ID and secret to a Composio auth config, then have each user approve their own connection. This illustrates the setup to complete outside this prototype.</figcaption>
  </figure>;
}
function Node({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex min-w-0 flex-1 flex-col items-center gap-2 [&_svg]:size-5 [&_svg]:text-primary"><span>{icon}</span><span className="text-xs font-medium sm:text-sm">{label}</span></div>;
}
