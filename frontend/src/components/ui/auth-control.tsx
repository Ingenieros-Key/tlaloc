"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { useAuthProfile } from "@/lib/auth";
import { useLang } from "@/lib/i18n-store";
import { navCopy } from "./i18n";
import { AuthModal } from "./auth-modal";
import { UserMenu } from "./user-menu";
import { LangToggle, ThemeToggle } from "./toggles";
import { cn } from "@/lib/utils";

/**
 * Auth entry point for the nav: Sign in button when signed out, a Welcome + avatar
 * menu when signed in. Pass `menuExtras` to fold the language/theme toggles into the
 * avatar menu (used in the workspace, where top-bar space is tight).
 */
export function AuthControl({ menuExtras = false, className }: { menuExtras?: boolean; className?: string }) {
  const t = navCopy[useLang()];
  const { status, firstName, refresh, signOut } = useAuthProfile();
  const [open, setOpen] = useState(false);

  if (status === "loading") {
    return <img src="/tlaloc-loader.svg" alt="" aria-hidden width={28} height={28} className={className} />;
  }

  if (status === "in") {
    return (
      <UserMenu
        firstName={firstName}
        onSignOut={signOut}
        extra={
          menuExtras ? (
            <div className="mb-1 flex items-center justify-between gap-2 border-b border-line px-3 py-2">
              <LangToggle />
              <ThemeToggle />
            </div>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {menuExtras && (
          <>
            <LangToggle />
            <ThemeToggle />
          </>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 font-mono text-sm font-medium text-on-accent transition-opacity hover:opacity-90",
            className,
          )}
        >
          <LogIn className="h-4 w-4" strokeWidth={1.75} />
          {t.signIn}
        </button>
      </div>
      <AuthModal open={open} onClose={() => setOpen(false)} onAuthed={refresh} />
    </>
  );
}
