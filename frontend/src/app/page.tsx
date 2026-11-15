"use client";

import Link from "next/link";
import { SiteNav } from "@/components/ui/site-nav";
import { landingCopy } from "@/components/ui/i18n";
import { useLang } from "@/lib/i18n-store";

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
  --piedra: #9aa3c7;
  --obsidiana: #060818;
}
.tl-main {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 2.5rem 1.5rem 4rem; gap: 1.5rem;
}
.tl-tag {
  font-family: var(--font-plex-mono), monospace; color: var(--jade);
  font-size: 0.8rem; letter-spacing: 0.22em; text-transform: uppercase;
}
.tl-h1 {
  font-family: var(--font-chakra), sans-serif; font-weight: 700;
  font-size: clamp(1.9rem, 4.5vw, 3.2rem); line-height: 1.08; max-width: 20ch;
}
.tl-lead {
  font-family: var(--font-plex-sans), sans-serif;
  max-width: 60ch; color: var(--piedra); font-size: clamp(1rem, 2.2vw, 1.15rem); line-height: 1.7;
}
.tl-video {
  width: min(760px, 92vw); height: auto; margin-top: 0.75rem;
  border-radius: 16px; border: 1px solid rgba(154,163,199,0.25);
  box-shadow: 0 20px 60px rgba(0,0,0,0.45); background: #000;
}
.tl-cta {
  display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;
  border: 1px solid var(--jade); background: var(--jade); color: var(--obsidiana);
  border-radius: 999px; padding: 0.7rem 1.6rem; cursor: pointer; text-decoration: none;
  font-family: var(--font-plex-mono), monospace; font-size: 0.9rem; font-weight: 500;
  letter-spacing: 0.04em; transition: opacity 0.15s;
}
.tl-cta:hover { opacity: 0.9; }
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
html.tl-light-theme .tl-h1 { color: #0b1033; }
html.tl-light-theme .tl-tag { color: #0a7268; }
html.tl-light-theme .tl-lead { color: #5b6178; }
html.tl-light-theme .tl-footer { color: rgba(11,16,51,0.55); }
`;

export default function Home() {
  const t = landingCopy[useLang()];

  return (
    <div className="tl-root">
      <style>{css}</style>
      <SiteNav />

      <main className="tl-main">
        <span className="tl-tag">{t.tag}</span>
        <h1 className="tl-h1">{t.headline}</h1>
        <p className="tl-lead">{t.description}</p>
        <video className="tl-video" src="/tlaloc-intro.mp4" controls playsInline preload="metadata" />
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
