"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SiteNav } from "@/components/ui/site-nav";
import { Reveal } from "@/components/ui/reveal";
import { aboutCopy } from "@/components/ui/i18n";
import { useLang } from "@/lib/i18n-store";

type StickerId = "tlaloc" | "nasa" | "flag";

export default function AboutPage() {
  const t = aboutCopy[useLang()];
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<StickerId | null>(null);

  const stickers: Array<{
    id: StickerId;
    style: React.CSSProperties;
    node: React.ReactNode;
    bg: string;
    tip: { title: string; body: string };
  }> = [
    {
      id: "tlaloc",
      style: { top: "-18px", left: "-18px" },
      bg: "bg-[#0B1033]",
      node: <img src="/tlaloc-mascot.png" alt="" className="h-full w-full object-contain p-1.5" />,
      tip: t.stickers.tlaloc,
    },
    {
      id: "nasa",
      style: { top: "-18px", right: "-18px" },
      bg: "bg-white",
      node: <img src="/nasa-logo.png" alt="" className="h-full w-full object-contain p-1" />,
      tip: t.stickers.nasa,
    },
    {
      id: "flag",
      style: { bottom: "-18px", left: "40px" },
      bg: "bg-white",
      node: <span className="text-2xl leading-none">🇸🇻</span>,
      tip: t.stickers.flag,
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_1fr] md:gap-14">
          <div>
            <Reveal delay={0.02}>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">{t.title}</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-wide sm:text-5xl">
                {t.tagline}
              </h1>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="mt-6 font-sans text-base leading-relaxed text-muted sm:text-lg">{t.intro}</p>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="relative">
              <img
                src="/team.jpg"
                alt="Tlaloc team"
                className="w-full rounded-2xl border border-line object-cover shadow-xl shadow-black/30"
              />
              {stickers.map((st, i) => (
                <div key={st.id} className="absolute" style={st.style}>
                  <motion.button
                    type="button"
                    onClick={() => setOpen((o) => (o === st.id ? null : st.id))}
                    aria-expanded={open === st.id}
                    aria-label={st.tip.title}
                    initial={reduce ? { opacity: 0 } : { scale: 0, opacity: 0, rotate: -12 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.5 + i * 0.15, type: "spring", stiffness: 300, damping: 15 }}
                    whileHover={reduce ? undefined : { scale: 1.08 }}
                    className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-lg ${st.bg}`}
                  >
                    {st.node}
                  </motion.button>
                  {open === st.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.18 }}
                      role="tooltip"
                      className="absolute left-1/2 top-full z-20 mt-2 w-60 -translate-x-1/2 rounded-xl border border-line bg-surface-2 p-3 text-left shadow-xl shadow-black/40"
                    >
                      <p className="font-display text-sm font-bold text-text">{st.tip.title}</p>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-muted">{st.tip.body}</p>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <p className="mt-14 max-w-3xl font-sans text-base leading-relaxed text-muted sm:text-lg">{t.carey}</p>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="mt-8 max-w-3xl rounded-2xl border border-line bg-surface-2 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">{t.disciplinesLabel}</p>
            <p className="mt-2 font-sans text-sm leading-relaxed text-text sm:text-base">{t.disciplines}</p>
          </div>
        </Reveal>
      </main>
      <footer className="border-t border-line py-6 text-center font-mono text-xs text-muted">
        tlaloc.space · <a href="mailto:info@tlaloc.space" className="text-accent">info@tlaloc.space</a>
      </footer>
    </div>
  );
}
