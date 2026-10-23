import type { Metadata } from "next";
import { Suspense } from "react";
import { Generating } from "@/components/generating";

export const metadata: Metadata = { title: "Generating a plan" };

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-6 py-12 text-muted-foreground">Starting…</div>}>
      <Generating />
    </Suspense>
  );
}
