"use client";

import { SiteNav } from "@/components/ui/site-nav";
import { aboutCopy } from "@/components/ui/i18n";
import { useLang } from "@/lib/i18n-store";

export default function AboutPage() {
  const t = aboutCopy[useLang()];
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <SiteNav />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide sm:text-6xl">{t.title}</h1>
        <p className="font-mono text-sm text-muted">{t.body}</p>
      </main>
    </div>
  );
}
