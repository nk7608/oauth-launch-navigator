"use client";

import { ExternalLinkIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { strongestLabel, type PlanEvidence } from "@/lib/rules";
import { cn } from "@/lib/utils";

export const EVIDENCE_META: Record<PlanEvidence["label"], { label: string; text: string; dot: string; help: string }> = {
  official: { label: "Official", text: "text-ev-official", dot: "bg-ev-official", help: "Stated by the provider or Composio" },
  reported: { label: "Reported", text: "text-ev-reported", dot: "bg-ev-reported", help: "From a credible third party" },
  tested: { label: "Tested", text: "text-ev-tested", dot: "bg-ev-tested", help: "We did this ourselves" },
  inferred: { label: "Inferred", text: "text-ev-inferred", dot: "bg-ev-inferred", help: "Reasoned from official facts" },
  unknown: { label: "Unknown", text: "text-ev-unknown", dot: "border border-dashed border-ev-unknown", help: "Not established" },
};

export function EvidenceDot({ label }: { label: PlanEvidence["label"] }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", EVIDENCE_META[label].dot)} />;
}

/** Chip showing the strongest evidence behind a claim; opens the supporting sources in a popover. */
export function EvidenceChip({ ids, evidence }: { ids: string[]; evidence: PlanEvidence[] }) {
  const label = strongestLabel(ids, evidence);
  const meta = EVIDENCE_META[label];
  const items = ids.map((id) => evidence.find((e) => e.id === id)).filter(Boolean) as PlanEvidence[];
  return (
    <Popover>
      <PopoverTrigger
        title={meta.help}
        className={cn(
          "inline-flex w-fit items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
          meta.text,
        )}
      >
        <EvidenceDot label={label} />
        {meta.label}
        <span className="text-muted-foreground tabular-nums">{items.length > 1 ? `· ${items.length} sources` : ""}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] p-0">
        <EvidenceList items={items} className="border-0 bg-transparent" />
      </PopoverContent>
    </Popover>
  );
}

export function EvidenceList({ items, className }: { items: PlanEvidence[]; className?: string }) {
  return (
    <ul className={cn("space-y-2 rounded-md border bg-muted/40 p-3 text-sm", className)}>
      {items.map((e) => (
        <li key={e.id} className="flex gap-2">
          <EvidenceDot label={e.label} />
          <span className="-mt-1">
            <span className={cn("font-medium", EVIDENCE_META[e.label].text)}>{EVIDENCE_META[e.label].label}.</span> {e.claim}{" "}
            {e.url ? (
              <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline">
                {e.sourceTitle}
                <ExternalLinkIcon className="size-3" aria-hidden />
              </a>
            ) : (
              <span className="text-muted-foreground">({e.sourceTitle})</span>
            )}
            {e.note && <span className="block text-muted-foreground">Note: {e.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
