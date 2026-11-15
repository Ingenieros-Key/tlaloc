"use client";

import { Brand } from "./brand";
import { NavLinks } from "./nav-links";
import { LangToggle, ThemeToggle } from "./toggles";
import { AuthControl } from "./auth-control";

/** Marketing header used on the home and about pages. */
export function SiteNav() {
  return (
    <header className="relative z-40 flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-8">
        <Brand />
        <NavLinks className="max-md:hidden" />
      </div>
      <div className="flex items-center gap-3">
        <LangToggle />
        <ThemeToggle />
        <AuthControl />
      </div>
    </header>
  );
}
