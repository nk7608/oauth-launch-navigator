import { GuideFlow } from "@/components/connection-diagram";
import { Catalog } from "@/components/catalog";
import { apps } from "@/lib/apps";
import { guideStatuses } from "@/lib/guides";

export default function Home() {
  const statuses = guideStatuses();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Get a clear plan for your OAuth app setup</h1>
      <p className="mt-3 max-w-[62ch] text-lg text-muted-foreground">
        Find out how to register a provider OAuth app, handle approval, and configure it in Composio.
        See the steps, the wait, who must act, and what you can delegate.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {apps.length} apps in the catalog · {Object.keys(statuses).length} guides ready. Other apps can be researched live.
      </p>
      <div className="mt-6"><GuideFlow /></div>
      <div className="mt-8">
        <Catalog statuses={statuses} />
      </div>
    </div>
  );
}
