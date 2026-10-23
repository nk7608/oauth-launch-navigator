// Server-only access to library plans in data/guides/<slug>.json.
import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Plan } from "@/lib/plan-schema";

const GUIDES_DIR = path.join(process.cwd(), "data", "guides");

export type GuideStatus = Plan["meta"]["status"];

export function librarySlugs(): string[] {
  return readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

export function loadGuide(slug: string): Plan | undefined {
  if (!librarySlugs().includes(slug)) return undefined;
  const raw = JSON.parse(readFileSync(path.join(GUIDES_DIR, `${slug}.json`), "utf8"));
  return Plan.parse(raw);
}

/** slug → guide status, for catalog badges. */
export function guideStatuses(): Record<string, GuideStatus> {
  return Object.fromEntries(librarySlugs().map((slug) => [slug, loadGuide(slug)!.meta.status]));
}
