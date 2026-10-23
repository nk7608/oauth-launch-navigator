// Catalog of library apps (data/apps.json) plus app resolution for search. Safe to import on the client.
import appsData from "@/data/apps.json";

export const OAUTH_SCHEMES = ["OAUTH2", "OAUTH1", "S2S_OAUTH2", "DCR_OAUTH"];

export type AppEntry = {
  slug: string;
  name: string;
  category: string;
  managedAppAvailable: boolean;
  authSchemes: string[];
  managedAuthSchemes?: string[];
  website?: string;
  toolsCount?: number | null;
  guideStatus: string;
  plannedVerified: boolean;
};

export type SetupType = "ready" | "own_app" | "not_oauth";

export const SETUP_TYPE_LABEL: Record<SetupType, string> = {
  ready: "Ready to use",
  own_app: "Needs your own app",
  not_oauth: "Not OAuth",
};

export const apps: AppEntry[] = appsData.apps as AppEntry[];

export const categories: string[] = [...new Set(apps.map((a) => a.category))];

export function setupType(app: Pick<AppEntry, "managedAppAvailable" | "authSchemes">): SetupType {
  if (!app.authSchemes.some((s) => OAUTH_SCHEMES.includes(s))) return "not_oauth";
  return app.managedAppAvailable ? "ready" : "own_app";
}

export function getApp(slug: string): AppEntry | undefined {
  return apps.find((a) => a.slug === slug);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** "https://www.pipedrive.com/en" → "pipedrive"; plain names pass through normalized. */
export function queryKey(query: string): string {
  const q = query.trim();
  if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(q)) {
    const host = new URL(q.startsWith("http") ? q : `https://${q}`).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    // app.hubspot.com → hubspot; zoom.us → zoom
    return norm(parts.length > 2 ? parts[parts.length - 2] : parts[0]);
  }
  return norm(q);
}

function domainKey(website?: string): string | undefined {
  if (!website) return undefined;
  try {
    return queryKey(website);
  } catch {
    return undefined;
  }
}

/** Ranks library apps for a query: exact name/slug/domain first, then prefix, then substring. */
export function searchApps(query: string, list: AppEntry[] = apps): AppEntry[] {
  const key = queryKey(query);
  if (!key) return list;
  const scored = list
    .map((a) => {
      const keys = [norm(a.name), norm(a.slug), domainKey(a.website)].filter(Boolean) as string[];
      const score = keys.some((k) => k === key) ? 3 : keys.some((k) => k.startsWith(key)) ? 2 : keys.some((k) => k.includes(key)) ? 1 : 0;
      return { a, score };
    })
    .filter((x) => x.score > 0);
  return scored.sort((x, y) => y.score - x.score).map((x) => x.a);
}

/** Exact library match for a query (name, slug or website domain), used to skip live generation. */
export function resolveApp(query: string): AppEntry | undefined {
  const top = searchApps(query)[0];
  if (!top) return undefined;
  const key = queryKey(query);
  return [norm(top.name), norm(top.slug), domainKey(top.website)].includes(key) ? top : undefined;
}
