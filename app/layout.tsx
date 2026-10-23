import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: `${BRAND.name}: ${BRAND.tagline}`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  openGraph: { title: BRAND.name, description: BRAND.tagline, siteName: BRAND.name, type: "website" },
  twitter: { card: "summary_large_image", title: BRAND.name, description: BRAND.tagline },
};

const NAV = [
  { href: "/", label: "Catalog" },
  { href: "/demo", label: "Demo" },
  { href: "/verification", label: "What we checked" },
];

const navLink =
  "rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="border-b bg-card">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
              <img src="/brand/logo-mark.svg" alt="" width={28} height={28} className="size-7" />
              <span className="text-[17px]">{BRAND.name}</span>
            </Link>
            <nav aria-label="Main" className="flex items-center gap-1">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={`${navLink} ${n.href === "/" ? "hidden sm:inline-flex" : ""}`}>
                  {n.label}
                </Link>
              ))}
              <a href={BRAND.github} target="_blank" rel="noreferrer" className={`${navLink} hidden sm:inline-flex`}>
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="border-t bg-card">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              {BRAND.name}: {BRAND.tagline}
            </span>
            <span className="flex gap-4">
              <Link href="/verification" className="hover:text-foreground">
                What we checked
              </Link>
              <a href={BRAND.github} target="_blank" rel="noreferrer" className="hover:text-foreground">
                Source on GitHub
              </a>
            </span>
          </div>
        </footer>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
