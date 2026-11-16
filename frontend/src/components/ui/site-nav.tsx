"use client";

import { Brand } from "./brand";
import { NavLinks } from "./nav-links";
import { LangToggle, ThemeToggle } from "./toggles";
import { AuthControl } from "./auth-control";
import { MobileMenu } from "./mobile-menu";

/** Marketing header used on the home and about pages. Collapses to a burger below md. */
export function SiteNav() {
  return (
    <header className="relative z-40 flex h-[var(--tl-topbar-h)] items-center justify-between gap-4 border-b border-line px-4">
      <div className="flex items-center gap-8">
        <Brand />
        <NavLinks className="max-md:hidden" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 max-md:hidden">
          <LangToggle />
          <ThemeToggle />
        </div>
        <div className="flex min-w-[12.5rem] justify-end max-md:min-w-0">
          <AuthControl />
        </div>
        <MobileMenu className="md:hidden" />
      </div>
    </header>
  );
}
