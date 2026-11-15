"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { getCurrentUser } from "aws-amplify/auth";
import "@/lib/amplify";
import { AuthModal } from "@/components/ui/auth-modal";
import { landingCopy, type Lang } from "@/components/ui/i18n";

const PROGRESS = 65;

function GrowingScene() {
  const reduce = useReducedMotion();
  const drops = Array.from({ length: 10 }, (_, i) => i);
  return (
    <svg viewBox="0 0 200 160" className="h-44 w-44" role="img" aria-label="A seedling growing in the rain">
      {!reduce &&
        drops.map((i) => (
          <motion.line
            key={i}
            x1={30 + i * 15}
            y1={-10}
            x2={26 + i * 15}
            y2={6}
            stroke="#1FC8B4"
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 150, opacity: [0, 0.9, 0] }}
            transition={{ duration: 1 + (i % 4) * 0.2, delay: (i % 5) * 0.3, repeat: Infinity, ease: "linear" }}
          />
        ))}

      <ellipse cx="100" cy="150" rx="55" ry="8" fill="#0B1033" opacity={0.1} />

      <motion.g
        style={{ transformOrigin: "100px 148px" }}
        initial={{ scaleY: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      >
        <path d="M100 148 V92" stroke="#5DBB63" strokeWidth={5} strokeLinecap="round" />
        <motion.path
          d="M100 118 C78 112 70 92 72 80 C92 82 102 100 100 118 Z"
          fill="#5DBB63"
          initial={{ scale: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6, type: "spring" }}
          style={{ transformOrigin: "100px 118px" }}
        />
        <motion.path
          d="M100 108 C122 102 130 82 128 70 C108 72 98 90 100 108 Z"
          fill="#1FC8B4"
          initial={{ scale: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6, type: "spring" }}
          style={{ transformOrigin: "100px 108px" }}
        />
        <motion.circle
          cx="100"
          cy="78"
          r="6"
          fill="#F6B93B"
          initial={{ scale: reduce ? 1 : 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 300 }}
        />
      </motion.g>
    </svg>
  );
}

function LangFlipper({ lang, onToggle }: { lang: Lang; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative h-9 w-[4.5rem] overflow-hidden rounded-full border border-white/20 bg-white/5 text-sm font-medium text-white"
      aria-label="Toggle language"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={lang}
          initial={{ y: 14, opacity: 0, rotateX: -90 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: -14, opacity: 0, rotateX: 90 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {lang === "en" ? "EN" : "ES"}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [modalOpen, setModalOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const t = landingCopy[lang];

  const refresh = () =>
    getCurrentUser()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-[#0B1033] via-[#0B1033] to-[#122152] text-white">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <img src="/tlaloc-icon.svg" alt="Tlaloc" className="h-9 w-9" />
          <span className="text-lg font-semibold tracking-tight">Tlaloc</span>
        </div>
        <div className="flex items-center gap-3">
          <LangFlipper lang={lang} onToggle={() => setLang((l) => (l === "en" ? "es" : "en"))} />
          {authed ? (
            <span className="flex items-center gap-2 rounded-full bg-[#1FC8B4]/15 px-3 py-1.5 text-sm font-medium text-[#1FC8B4]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {t.signedIn}
            </span>
          ) : (
            <motion.button
              type="button"
              onClick={() => setModalOpen(true)}
              whileTap={{ scale: 0.97 }}
              className="rounded-full bg-[#1FC8B4] px-5 py-2 text-sm font-semibold text-[#0B1033] hover:bg-[#1FC8B4]/90"
            >
              {t.signIn}
            </motion.button>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-20 text-center">
        <GrowingScene />

        <span className="rounded-full border border-[#F6B93B]/40 bg-[#F6B93B]/10 px-4 py-1 text-sm font-medium text-[#F6B93B]">
          {t.status}
        </span>

        <AnimatePresence mode="wait">
          <motion.div
            key={lang}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="max-w-xl"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t.heading}</h1>
            <p className="mt-4 text-lg text-white/70">{t.sub}</p>
          </motion.div>
        </AnimatePresence>

        <div className="w-full max-w-md">
          <div className="mb-2 flex justify-between text-sm text-white/60">
            <span>{t.progress}</span>
            <span>{PROGRESS}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#5DBB63] via-[#1FC8B4] to-[#F6B93B]"
              initial={{ width: 0 }}
              animate={{ width: `${PROGRESS}%` }}
              transition={{ duration: 1.6, ease: "easeOut", delay: 0.3 }}
            />
          </div>
        </div>
      </main>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} lang={lang} onAuthed={refresh} />
    </div>
  );
}
