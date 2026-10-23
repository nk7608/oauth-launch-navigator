"use client";

// Small, safe Markdown renderer for step text: **bold**, `code` (click to copy), [links](https://…), "- " lists,
// bare https URLs, and menu paths like "APIs & Services → Library → Gmail API" rendered as breadcrumb chips.
// It builds React elements only (no HTML injection), so model-written plans can't inject markup.
import { Fragment, useState } from "react";
import { CheckIcon, ChevronRightIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s)]+[^\s).,;:])/g;
// A menu path: 2+ "→"-separated labels, each up to ~5 words.
const MENU_PATH = /((?:[A-Z][\w&'’.\-]*(?: [\w&'’.\-]+){0,4} → ){1,}[A-Z][\w&'’.\-]*(?: [\w&'’.\-]+){0,4})/g;

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className={cn("space-y-2", className)}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*] /.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l.replace(/^\s*[-*] /, "")} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <Inline text={block} />
          </p>
        );
      })}
    </div>
  );
}

export function Inline({ text }: { text: string }) {
  // Menu paths first, then inline Markdown inside the remaining pieces.
  return (
    <>
      {text.split(MENU_PATH).map((part, i) =>
        i % 2 === 1 ? <MenuPath key={i} path={part} /> : <Fragment key={i}>{inlineMarkdown(part)}</Fragment>,
      )}
    </>
  );
}

function inlineMarkdown(text: string) {
  return text.split(INLINE).map((tok, i) => {
    if (!tok) return null;
    if (tok.startsWith("**")) return <strong key={i} className="font-semibold">{tok.slice(2, -2)}</strong>;
    if (tok.startsWith("`")) return <CopyCode key={i} value={tok.slice(1, -1)} />;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(tok);
    if (link) return <ExtLink key={i} href={link[2]}>{link[1]}</ExtLink>;
    if (/^https?:\/\//.test(tok)) return <ExtLink key={i} href={tok}>{tok.replace(/^https?:\/\//, "")}</ExtLink>;
    return <Fragment key={i}>{tok}</Fragment>;
  });
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:no-underline">
      {children}
    </a>
  );
}

function MenuPath({ path }: { path: string }) {
  const parts = path.split(" → ").map((p) => p.replace(/[.,;:]$/, ""));
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle" aria-label={`Menu path: ${parts.join(", then ")}`}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRightIcon className="size-3.5 text-muted-foreground" aria-hidden />}
          <span className="rounded-md border bg-muted px-1.5 py-0.5 text-[13px] leading-tight font-medium">{p}</span>
        </Fragment>
      ))}
    </span>
  );
}

/** Inline code that copies itself on click (scopes, URLs, values). */
export function CopyCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Copied ${value.length > 40 ? "value" : value}`);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  }
  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${value}`}
      className="group inline-flex max-w-full items-center gap-1 rounded-md border bg-muted px-1.5 py-0.5 align-baseline font-mono text-[0.85em] break-all hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span>{value}</span>
      <Icon className="size-3 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
    </button>
  );
}
