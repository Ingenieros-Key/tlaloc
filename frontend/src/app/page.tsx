"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import "@/lib/amplify";
import { AuthModal } from "@/components/ui/auth-modal";
import { landingCopy, type Lang } from "@/components/ui/i18n";
import { applyTheme, readStoredTheme, type Theme } from "@/lib/theme";

const css = `
.tl-root {
  color: var(--hueso);
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(31,200,180,0.14), transparent 60%),
    radial-gradient(900px 500px at 85% 110%, rgba(43,58,158,0.35), transparent 60%),
    #0b1033;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  --hueso: #f4f0e6;
  --jade: #1fc8b4;
  --maiz: #f6b93b;
  --piedra: #9aa3c7;
  --obsidiana: #060818;
}
.tl-topleft { position: absolute; top: 1.25rem; left: 1.25rem; z-index: 2; }
.tl-topright { position: absolute; top: 1.25rem; right: 1.25rem; z-index: 2; display: flex; align-items: center; gap: 0.75rem; }
.tl-brand { display: inline-flex; align-items: center; gap: 0.55rem; }
.tl-brand img { width: 40px; height: 40px; }
.tl-brand span { font-family: var(--font-chakra), sans-serif; font-weight: 700; font-size: 1.3rem; color: var(--hueso); letter-spacing: 0.02em; }
.tl-hero-gif { width: min(360px, 82vw); height: auto; border-radius: 16px; display: block; box-shadow: 0 10px 40px rgba(0,0,0,0.35); }
.tl-lang {
  display: inline-flex; border: 1px solid rgba(154,163,199,0.4);
  border-radius: 999px; overflow: hidden;
  font-family: var(--font-plex-mono), monospace; font-size: 0.8rem;
}
.tl-lang button {
  background: transparent; color: var(--piedra); border: 0;
  padding: 0.4rem 0.8rem; cursor: pointer; letter-spacing: 0.05em;
}
.tl-lang button[aria-pressed="true"] { background: var(--jade); color: var(--obsidiana); font-weight: 500; }
.tl-signin {
  display: inline-flex; align-items: center; gap: 0.5rem;
  border: 1px solid var(--jade); background: var(--jade); color: var(--obsidiana);
  border-radius: 999px; padding: 0.45rem 1.1rem; cursor: pointer;
  font-family: var(--font-plex-mono), monospace; font-size: 0.8rem; font-weight: 500;
  letter-spacing: 0.04em; transition: opacity 0.15s;
}
.tl-signin:hover { opacity: 0.9; }
.tl-chip {
  display: inline-flex; align-items: center; gap: 0.5rem;
  border: 1px solid rgba(31,200,180,0.4); background: rgba(31,200,180,0.12); color: var(--jade);
  border-radius: 999px; padding: 0.45rem 1.1rem; cursor: pointer;
  font-family: var(--font-plex-mono), monospace; font-size: 0.8rem; letter-spacing: 0.04em;
  transition: background 0.15s;
}
.tl-chip:hover { background: rgba(31,200,180,0.2); }
.tl-chip .tl-logout { opacity: 0.7; }
.tl-main {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 2rem 1.5rem 3rem; gap: 1.5rem;
}
.tl-mark { width: min(200px, 50vw); height: auto; }
.tl-wordmark {
  font-family: var(--font-chakra), sans-serif; font-weight: 700;
  font-size: clamp(2.5rem, 8vw, 4.5rem); line-height: 1; letter-spacing: 0.02em;
  color: var(--hueso); margin-top: -0.25rem;
}
.tl-tag {
  font-family: var(--font-plex-mono), monospace; color: var(--jade);
  font-size: 0.8rem; letter-spacing: 0.22em; text-transform: uppercase;
}
.tl-h1 { font-family: var(--font-chakra), sans-serif; font-weight: 700; font-size: clamp(2rem, 6vw, 3.5rem); line-height: 1.05; }
.tl-lead { max-width: 40ch; color: var(--piedra); font-size: clamp(1rem, 2.5vw, 1.15rem); line-height: 1.6; }
.tl-dot {
  display: inline-block; width: 0.55rem; height: 0.55rem; border-radius: 999px;
  background: var(--maiz); box-shadow: 0 0 0 0 rgba(246,185,59,0.6); animation: tl-pulse 2s infinite;
}
@keyframes tl-pulse {
  0% { box-shadow: 0 0 0 0 rgba(246,185,59,0.5); }
  70% { box-shadow: 0 0 0 10px rgba(246,185,59,0); }
  100% { box-shadow: 0 0 0 0 rgba(246,185,59,0); }
}
.tl-status {
  display: inline-flex; align-items: center; gap: 0.6rem;
  font-family: var(--font-plex-mono), monospace; font-size: 0.85rem; color: var(--hueso);
}
.tl-footer {
  text-align: center; padding: 1.5rem; color: rgba(154,163,199,0.6);
  font-size: 0.75rem; font-family: var(--font-plex-mono), monospace;
}
.tl-footer a { color: var(--jade); text-decoration: none; }
.tl-iconbtn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.25rem; height: 2.25rem; border-radius: 999px;
  border: 1px solid rgba(154,163,199,0.4); background: transparent; color: var(--hueso);
  cursor: pointer; transition: background 0.15s;
}
.tl-iconbtn:hover { background: rgba(154,163,199,0.15); }
.tl-cta {
  display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;
  border: 1px solid var(--jade); background: transparent; color: var(--jade);
  border-radius: 999px; padding: 0.6rem 1.4rem; cursor: pointer; text-decoration: none;
  font-family: var(--font-plex-mono), monospace; font-size: 0.85rem; font-weight: 500;
  letter-spacing: 0.04em; transition: background 0.15s, color 0.15s;
}
.tl-cta:hover { background: var(--jade); color: var(--obsidiana); }
.tl-light {
  color: #0b1033;
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(31,200,180,0.20), transparent 60%),
    radial-gradient(900px 500px at 85% 110%, rgba(246,185,59,0.22), transparent 60%),
    #f4f0e6;
}
.tl-light .tl-wordmark, .tl-light .tl-h1, .tl-light .tl-brand span, .tl-light .tl-status { color: #0b1033; }
.tl-light .tl-tag { color: #0a7268; }
.tl-light .tl-lead { color: #5b6178; }
.tl-light .tl-footer { color: rgba(11,16,51,0.55); }
.tl-light .tl-lang { border-color: rgba(11,16,51,0.25); }
.tl-light .tl-lang button { color: #5b6178; }
.tl-light .tl-iconbtn { color: #0b1033; border-color: rgba(11,16,51,0.25); }
.tl-light .tl-iconbtn:hover { background: rgba(11,16,51,0.08); }
@media (prefers-reduced-motion: reduce) { .tl-dot { animation: none; } }
`;

export default function Home() {
  const [lang, setLang] = useState<Lang>("es");
  const [modalOpen, setModalOpen] = useState(false);
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [theme, setTheme] = useState<Theme>("dark");
  const t = landingCopy[lang];

  const refresh = () =>
    getCurrentUser()
      .then(() => setAuth("in"))
      .catch(() => setAuth("out"));

  useEffect(() => {
    refresh();
    const saved = readStoredTheme();
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const toggleTheme = () =>
    setTheme((p) => {
      const next: Theme = p === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });

  return (
    <div className={`tl-root${theme === "light" ? " tl-light" : ""}`}>
      <style>{css}</style>

      <div className="tl-topleft">
        {auth === "loading" ? (
          <img src="/tlaloc-loader.svg" alt="" aria-hidden width={32} height={32} />
        ) : auth === "in" ? (
          <div className="tl-brand">
            <img src="/favicon.svg" alt="Tlaloc" />
            <span>Tlaloc</span>
          </div>
        ) : (
          <button type="button" className="tl-signin" onClick={() => setModalOpen(true)}>
            {t.signIn}
          </button>
        )}
      </div>

      <div className="tl-topright">
        <button type="button" className="tl-iconbtn" onClick={toggleTheme} title={t.theme} aria-label={t.theme}>
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
            </svg>
          )}
        </button>
        <div className="tl-lang" role="group" aria-label="Language">
          <button data-lang="es" aria-pressed={lang === "es"} onClick={() => setLang("es")}>ES</button>
          <button data-lang="en" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
        </div>
        {auth === "in" && (
          <button
            type="button"
            className="tl-chip"
            onClick={() => signOut().then(() => setAuth("out")).catch(() => setAuth("out"))}
            title={t.signOut}
            aria-label={t.signOut}
          >
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {t.signedIn}
            <svg className="tl-logout" viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        )}
      </div>

      <main className="tl-main">
        {auth === "in" ? (
          <img className="tl-hero-gif" src="/tlaloc-crop-cycle-loop.gif" alt="Ciclo de cultivo de Tlaloc · Tlaloc crop cycle" />
        ) : (
          <>
            <img className="tl-mark" src="/tlaloc-mascot.png" alt="Tlaloc" />
            <p className="tl-wordmark">Tlaloc</p>
          </>
        )}
        <span className="tl-tag">{t.tag}</span>
        <h1 className="tl-h1">{t.heading}</h1>
        <p className="tl-lead">{t.lead}</p>
        <span className="tl-status">
          <span className="tl-dot" aria-hidden />
          <span>{t.building}</span>
        </span>
        <Link className="tl-cta" href="/workspace">
          {t.workspace}
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </main>

      <footer className="tl-footer">
        tlaloc.space · <a href="mailto:info@tlaloc.space">info@tlaloc.space</a>
      </footer>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} lang={lang} onAuthed={refresh} />
    </div>
  );
}
