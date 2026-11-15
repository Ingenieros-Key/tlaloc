"use client";

import { SiteNav } from "@/components/ui/site-nav";
import { aboutCopy } from "@/components/ui/i18n";
import { useLang } from "@/lib/i18n-store";

export default function AboutPage() {
  const t = aboutCopy[useLang()];
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">{t.title}</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-wide sm:text-5xl">{t.tagline}</h1>
        <p className="mt-6 font-sans text-base leading-relaxed text-muted sm:text-lg">{t.intro}</p>

        <img
          src="/team.jpg"
          alt="Tlaloc team"
          className="mt-8 w-full rounded-2xl border border-line object-cover shadow-xl shadow-black/30"
        />

        <p className="mt-8 font-sans text-base leading-relaxed text-muted sm:text-lg">{t.carey}</p>

        <div className="mt-8 rounded-2xl border border-line bg-surface-2 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">{t.disciplinesLabel}</p>
          <p className="mt-2 font-sans text-sm leading-relaxed text-text sm:text-base">{t.disciplines}</p>
        </div>
      </main>
      <footer className="border-t border-line py-6 text-center font-mono text-xs text-muted">
        tlaloc.space · <a href="mailto:info@tlaloc.space" className="text-accent">info@tlaloc.space</a>
      </footer>
    </div>
  );
}
