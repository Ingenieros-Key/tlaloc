"use client";

import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { landingCopy } from "@/components/ui/i18n";
import { useLang } from "@/lib/i18n-store";

const css = `
.tl-root {
  color: var(--tl-text);
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(31,200,180,0.12), transparent 60%),
    radial-gradient(900px 500px at 85% 110%, rgba(11,61,145,0.28), transparent 60%),
    var(--tl-bg);
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}
.tl-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: calc(var(--tl-topbar-h) + 2rem) 1.5rem 4rem; }
.tl-grid { display: grid; grid-template-columns: 1fr; gap: 2.5rem; width: min(1120px, 94vw); align-items: center; }
@media (min-width: 900px) { .tl-grid { grid-template-columns: 1.05fr 1fr; gap: 3.5rem; } }
.tl-col { text-align: left; display: flex; flex-direction: column; gap: 1.25rem; align-items: flex-start; }
.tl-tag {
  font-family: var(--font-plex-mono), monospace; color: var(--tl-accent);
  font-size: 0.8rem; letter-spacing: 0.22em; text-transform: uppercase;
}
.tl-h1 {
  font-family: var(--font-chakra), sans-serif; font-weight: 700;
  font-size: clamp(2rem, 4.2vw, 3.4rem); line-height: 1.07;
}
.tl-lead {
  font-family: var(--font-plex-sans), sans-serif;
  max-width: 50ch; color: var(--tl-muted); font-size: clamp(1rem, 1.6vw, 1.15rem); line-height: 1.7;
}
.tl-video {
  width: 100%; height: auto; display: block;
  border-radius: 18px; border: 1px solid var(--tl-line);
  box-shadow: 0 24px 70px rgba(0,0,0,0.5); background: #000;
}
.tl-cta {
  display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;
  border: 1px solid var(--tl-accent); background: var(--tl-accent); color: var(--tl-on-accent);
  border-radius: 999px; padding: 0.75rem 1.7rem; cursor: pointer; text-decoration: none;
  font-family: var(--font-plex-mono), monospace; font-size: 0.9rem; font-weight: 500;
  letter-spacing: 0.04em; transition: opacity 0.15s;
}
.tl-cta:hover { opacity: 0.9; }
.tl-footer {
  text-align: center; padding: 1.5rem; color: var(--tl-muted);
  font-size: 0.75rem; font-family: var(--font-plex-mono), monospace;
}
.tl-footer a { color: var(--tl-accent); text-decoration: none; }
`;

export default function Home() {
  const t = landingCopy[useLang()];

  return (
    <div className="tl-root">
      <style>{css}</style>

      <main className="tl-main">
        <div className="tl-grid">
          <div className="tl-col">
            <Reveal delay={0.02}>
              <span className="tl-tag">{t.tag}</span>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="tl-h1">{t.headline}</h1>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="tl-lead">{t.description}</p>
            </Reveal>
            <Reveal delay={0.26}>
              <Link className="tl-cta" href="/workspace">
                {t.workspace}
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <video className="tl-video" src="/tlaloc-intro-2.mp4" controls playsInline preload="metadata" />
          </Reveal>
        </div>
      </main>

      <footer className="tl-footer">
        tlaloc.space · <a href="mailto:info@tlaloc.space">info@tlaloc.space</a>
      </footer>
    </div>
  );
}
