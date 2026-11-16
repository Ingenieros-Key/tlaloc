"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, LogOut, User, UserCircle2 } from "lucide-react";
import { useLang } from "@/lib/i18n-store";
import { navCopy } from "./i18n";
import { NotificationsMenu } from "./notifications-menu";
import { ProfileModal } from "./profile-modal";

export function UserMenu({
  firstName,
  onSignOut,
  extra,
}: {
  firstName?: string;
  onSignOut: () => void;
  extra?: ReactNode;
}) {
  const t = navCopy[useLang()];
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 py-1.5 pl-3.5 pr-1.5 font-mono text-sm text-accent transition-colors hover:bg-accent/15"
      >
        <span className="max-sm:sr-only">{t.welcome(firstName)}</span>
        <UserCircle2 className="h-6 w-6" strokeWidth={1.75} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface-2 p-1.5 shadow-xl shadow-black/30"
        >
          {extra}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setProfileOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface-3"
          >
            <User className="h-4 w-4" strokeWidth={1.75} />
            {t.viewProfile}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setNotifOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface-3"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            {t.notifications}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface-3"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            {t.signOut}
          </button>
        </div>
      )}
      <NotificationsMenu open={notifOpen} onClose={() => setNotifOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
