import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Files read with fs at runtime: the research skill + schema (live prompt) and library guides.
  outputFileTracingIncludes: {
    "/api/generate/*": ["./.claude/skills/**/*", "./lib/plan-schema.ts"],
    "/api/generate": ["./data/guides/**/*"],
    "/api/plan/*": ["./data/guides/**/*"],
    "/plan/*": ["./data/guides/**/*"],
  },
  // Dynamic filesystem reads must not bundle local runs, visitor limits or secrets.
  outputFileTracingExcludes: {
    "/*": ["./.data/**/*", "./.env*"],
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
