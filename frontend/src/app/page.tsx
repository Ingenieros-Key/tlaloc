"use client";

import Link from "next/link";
import { SiteNav } from "@/components/ui/site-nav";
import { landingCopy } from "@/components/ui/i18n";
import { useLang } from "@/lib/i18n-store";
import { useAuthProfile } from "@/lib/auth";

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
.tl-main {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 2rem 1.5rem 3rem; gap: 1.5rem;
}
.tl-mark { width: min(200px, 50vw); height: auto; }
.tl-hero-gif { width: min(360px, 82vw); height: auto; border-radius: 16px; display: block; box-shadow: 0 10px 40px rgba(0,0,0,0.35); }
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
.tl-cta {
  display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;
  border: 1px solid var(--jade); background: transparent; color: var(--jade);
  border-radius: 999px; padding: 0.6rem 1.4rem; cursor: pointer; text-decoration: none;
  font-family: var(--font-plex-mono), monospace; font-size: 0.85rem; font-weight: 500;
  letter-spacing: 0.04em; transition: background 0.15s, color 0.15s;
}
.tl-cta:hover { background: var(--jade); color: var(--obsidiana); }
.tl-footer {
  text-align: center; padding: 1.5rem; color: rgba(154,163,199,0.6);
  font-size: 0.75rem; font-family: var(--font-plex-mono), monospace;
}
.tl-footer a { color: var(--jade); text-decoration: none; }

html.tl-light-theme .tl-root {
  color: #0b1033;
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(31,200,180,0.20), transparent 60%),
    radial-gradient(900px 500px at 85% 110%, rgba(246,185,59,0.22), transparent 60%),
    #f4f0e6;
}
html.tl-light-theme .tl-wordmark, html.tl-light-theme .tl-h1, html.tl-light-theme .tl-status { color: #0b1033; }
html.tl-light-theme .tl-tag { color: #0a7268; }
html.tl-light-theme .tl-lead { color: #5b6178; }
html.tl-light-theme .tl-footer { color: rgba(11,16,51,0.55); }
@media (prefers-reduced-motion: reduce) { .tl-dot { animation: none; } }
`;

export default function Home() {
  const t = landingCopy[useLang()];
  const { status } = useAuthProfile();
  const signedIn = status === "in";

  return (
    <div className="tl-root">
      <style>{css}</style>
      <SiteNav />

      <main className="tl-main">
        {signedIn ? (
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
    </div>
  );
}
