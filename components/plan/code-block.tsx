"use client";

import { CopyButton } from "@/components/plan/copy-button";

/** Labelled, copyable value: redirect URIs, code snippets, scope lists. Scrolls horizontally on small screens. */
export function CodeBlock({ label, value }: { label: string; value: string }) {
  const multiline = value.includes("\n");
  return (
    <figure className="overflow-hidden rounded-lg border bg-card">
      <figcaption className="flex items-center justify-between gap-2 border-b bg-muted/60 py-1 pr-1 pl-3 text-xs font-medium text-muted-foreground">
        {label}
        <CopyButton value={value} label="Copy" done={`${label} copied`} className="py-0.5 text-xs" />
      </figcaption>
      <pre className={`overflow-x-auto p-3 font-mono text-[13px] leading-relaxed ${multiline ? "" : "whitespace-pre"}`}>
        <code>{value}</code>
      </pre>
    </figure>
  );
}
