import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Files read with fs at runtime: the research skill + schema (live prompt) and library guides.
  outputFileTracingIncludes: {
    "/api/generate/[runId]": ["./.claude/skills/**/*", "./lib/plan-schema.ts"],
    "/api/plan/[slug]": ["./data/guides/**/*"],
    "/plan/[slug]": ["./data/guides/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
