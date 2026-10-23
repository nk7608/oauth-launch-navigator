"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import walkthrough from "@/data/walkthrough.json";

export function ScreenshotWalkthrough() {
  const [index, setIndex] = useState(0);
  const step = walkthrough.steps[index];
  return <div className="mt-8 space-y-5">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Walkthrough steps">
      {walkthrough.steps.map((item, number) => <button key={item.id} type="button" aria-pressed={number === index} aria-controls="walkthrough-screen" onClick={() => setIndex(number)} className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted aria-pressed:bg-foreground aria-pressed:text-background focus-visible:outline-2 focus-visible:outline-ring"><span className="font-mono">{number + 1}</span><span className="sr-only">. {item.title}</span></button>)}
    </div>
    <section id="walkthrough-screen" aria-live="polite" aria-labelledby="walkthrough-title">
      <p className="text-xs font-medium text-muted-foreground">Step {index + 1} of {walkthrough.steps.length}</p>
      <h2 id="walkthrough-title" className="mt-1 text-xl font-semibold">{step.title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{step.caption}</p>
      <figure className="mt-4 overflow-hidden rounded-lg border bg-muted/20">
        <a href={`/demo/${step.image}`} target="_blank" rel="noreferrer" aria-label={`Open full-size screenshot: ${step.title}`}>
          <Image key={step.image} src={`/demo/${step.image}`} alt={step.alt} width={1470} height={836} className="h-auto w-full" unoptimized />
        </a>
        <figcaption className="border-t px-4 py-2 text-xs text-muted-foreground">Real app capture · {walkthrough.capturedAt} · Select the image to view full size.</figcaption>
      </figure>
      <Link href={step.href} className="mt-3 inline-block text-sm text-primary underline">{step.linkLabel} →</Link>
    </section>
    <div className="flex items-center justify-between border-t pt-4">
      <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"><ArrowLeftIcon className="size-4" aria-hidden /> Previous</button>
      <button type="button" onClick={() => setIndex(index + 1)} disabled={index === walkthrough.steps.length - 1} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring">Next <ArrowRightIcon className="size-4" aria-hidden /></button>
    </div>
  </div>;
}
