import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "OAuth Launch Navigator",
  description:
    "Get a sourced, step-by-step plan to set up your own OAuth app, get it approved, and connect it to Composio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4">
              OAuth Launch Navigator
            </Link>
            <span className="hidden text-sm text-muted-foreground sm:inline">For agents built on Composio</span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
