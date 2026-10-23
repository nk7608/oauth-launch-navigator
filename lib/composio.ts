// Composio facts from the REST API (v3.1). These always overwrite anything a model says about Composio.
import "server-only";
import { OAUTH_SCHEMES } from "@/lib/apps";

const API = "https://backend.composio.dev/api/v3.1";

export type ToolkitFacts = {
  toolkitExists: boolean;
  toolkitSlug?: string;
  name?: string;
  authSchemes: string[];
  managedAppAvailable: boolean;
  redirectUri?: string;
  defaultScopes?: string[];
  appUrl?: string;
};

type Toolkit = {
  slug: string;
  name: string;
  auth_schemes?: string[];
  composio_managed_auth_schemes?: string[];
  auth_config_details?: {
    mode: string;
    fields?: { auth_config_creation?: { optional?: { name: string; default?: string }[] } };
  }[];
  meta?: { app_url?: string };
};

async function call<T>(path: string, signal?: AbortSignal): Promise<T | undefined> {
  const res = await fetch(`${API}${path}`, { headers: { "x-api-key": process.env.COMPOSIO_API_KEY ?? "" }, signal });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`Composio API ${path} → HTTP ${res.status}`);
  return res.json();
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Finds the toolkit for an app name: exact slug first, then Composio's search with a strict name match. */
export async function findToolkit(nameOrSlug: string, signal?: AbortSignal): Promise<ToolkitFacts> {
  const key = norm(nameOrSlug);
  let toolkit = /^[a-z0-9_]+$/.test(nameOrSlug) ? await call<Toolkit>(`/toolkits/${nameOrSlug}`, signal) : undefined;
  if (!toolkit) {
    const found = await call<{ items: Toolkit[] }>(`/toolkits?search=${encodeURIComponent(nameOrSlug)}&limit=10`, signal);
    const match = found?.items.find((t) => norm(t.slug) === key || norm(t.name) === key) ??
      found?.items.find((t) => key.length >= 4 && (key.startsWith(norm(t.slug)) || norm(t.name).startsWith(key)) && norm(t.slug).length >= 4);
    if (match) toolkit = await call<Toolkit>(`/toolkits/${match.slug}`, signal);
  }
  if (!toolkit) return { toolkitExists: false, authSchemes: [], managedAppAvailable: false };
  const authSchemes = toolkit.auth_schemes ?? toolkit.auth_config_details?.map((d) => d.mode) ?? [];
  const oauth = toolkit.auth_config_details?.find((d) => OAUTH_SCHEMES.includes(d.mode));
  const opt = (name: string) => oauth?.fields?.auth_config_creation?.optional?.find((f) => f.name === name)?.default;
  return {
    toolkitExists: true,
    toolkitSlug: toolkit.slug,
    name: toolkit.name,
    authSchemes,
    managedAppAvailable: (toolkit.composio_managed_auth_schemes ?? []).some((s) => OAUTH_SCHEMES.includes(s)),
    redirectUri: opt("oauth_redirect_uri"),
    defaultScopes: opt("scopes")?.split(/[ ,]+/).filter(Boolean),
    appUrl: toolkit.meta?.app_url,
  };
}

/** Composio's toolkit page (overview + FAQ) as a source; free and often the best blocker info. */
export async function toolkitDoc(slug: string, signal?: AbortSignal): Promise<{ url: string; title: string; content: string } | undefined> {
  try {
    const url = `https://docs.composio.dev/toolkits/${slug}`;
    const res = await fetch(`${url}.md`, { signal });
    if (!res.ok) return undefined;
    const md = await res.text();
    const end = md.search(/\n## (?!Frequently Asked Questions)/);
    return { url, title: `Composio: ${slug} toolkit`, content: (end > 0 ? md.slice(0, end) : md).slice(0, 8000) };
  } catch {
    return undefined;
  }
}

/** Composio's per-app OAuth setup guide (composio.dev/auth/<slug>) as plain text; used when web search is unavailable. */
export async function authGuide(slug: string, signal?: AbortSignal): Promise<{ url: string; title: string; content: string } | undefined> {
  const url = `https://composio.dev/auth/${slug}`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return undefined;
    const text = (await res.text())
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|li|h[1-6]|div|section)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim();
    return text.length > 400 ? { url, title: `Composio: ${slug} OAuth setup guide`, content: text.slice(0, 8000) } : undefined;
  } catch {
    return undefined;
  }
}
