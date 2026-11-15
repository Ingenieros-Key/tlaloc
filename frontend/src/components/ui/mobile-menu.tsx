"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLinks } from "./nav-links";
import { LangToggle, ThemeToggle } from "./toggles";
import { useLang } from "@/lib/i18n-store";
import { navCopy } from "./i18n";
import { cn } from "@/lib/utils";

/** Burger menu for small screens: nav links + language/theme toggles. */
export function MobileMenu({ className }: { className?: string }) {
  const t = navCopy[useLang()];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && ref.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t.menu}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-text transition-colors hover:bg-surface-3"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-line bg-surface-2 p-2 shadow-xl shadow-black/30"
          onClick={() => setOpen(false)}
        >
          <NavLinks vertical />
          <div className="my-2 h-px bg-line" />
          <div className="flex items-center justify-between px-2.5 py-1">
            <span className="text-[13px] text-muted">{t.language}</span>
            <LangToggle />
          </div>
          <div className="flex items-center justify-between px-2.5 py-1">
            <span className="text-[13px] text-muted">{t.theme}</span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  );
}
