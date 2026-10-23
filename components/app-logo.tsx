"use client";

import { cn } from "@/lib/utils";

/** App logo from Composio's logo service, over a lettered monogram that shows if the logo is missing. */
export function AppLogo({ slug, name, size = "md" }: { slug: string; name: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border bg-card font-semibold text-muted-foreground",
        size === "sm" ? "size-8 rounded-lg text-sm" : "size-12 rounded-xl text-lg",
      )}
    >
      <span aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- small remote SVG logos */}
      <img
        src={`https://logos.composio.dev/api/${slug}`}
        alt=""
        loading="lazy"
        className={cn("absolute inset-0 m-auto bg-card object-contain", size === "sm" ? "size-5" : "size-8")}
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    </span>
  );
}
