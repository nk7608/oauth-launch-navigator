import { Catalog } from "@/components/catalog";
import { AgentConnectDiagram } from "@/components/illustrations";
import { apps } from "@/lib/apps";
import { BRAND } from "@/lib/brand";
import { guideStatuses } from "@/lib/guides";

export default function Home() {
  const statuses = guideStatuses();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-[30px] leading-tight font-semibold tracking-tight text-balance">{BRAND.tagline}</h1>
      <p className="mt-3 max-w-[60ch] text-lg text-muted-foreground">
        Pick the app your agent connects to. Get the steps to register your own OAuth app, how long approval takes, who has to sign off, and what an
        agent can do for you.
      </p>
      <div className="mt-8">
        <Catalog
          statuses={statuses}
          summary={`${apps.length} apps in the catalog, ${Object.keys(statuses).length} researched guides ready. Any other app or website can be researched live.`}
          below={<AgentConnectDiagram />}
        />
      </div>
    </div>
  );
}
