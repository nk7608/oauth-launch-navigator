import { Catalog } from "@/components/catalog";
import { apps } from "@/lib/apps";
import { guideStatuses } from "@/lib/guides";

export default function Home() {
  const statuses = guideStatuses();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Get your agent&apos;s OAuth app ready for real users</h1>
      <p className="mt-3 max-w-[62ch] text-lg text-muted-foreground">
        Pick an app to see what it takes to register your own OAuth app, get it approved, and connect it to Composio: the steps,
        the wait, who has to sign off, and what an agent can do for you.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {apps.length} apps in the library. Any other app can be researched live.
      </p>
      <div className="mt-10">
        <Catalog statuses={statuses} />
      </div>
    </div>
  );
}
