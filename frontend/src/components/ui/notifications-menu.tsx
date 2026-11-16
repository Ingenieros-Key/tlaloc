"use client";

import { useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useLang } from "@/lib/i18n-store";
import { useNotifications } from "@/lib/useNotifications";
import { navCopy } from "./i18n";

/** Read-only overview of the signed-in user's email reminders. Toggling happens in the workspace. */
export function NotificationsMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const lang = useLang();
  const t = navCopy[lang];
  const { prefs, loading } = useNotifications();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.notifications}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface-2 p-6 text-text shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-lg font-semibold">
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            {t.notifications}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="rounded-full p-1.5 text-text/60 transition-colors hover:bg-surface-3 hover:text-text"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <p className="mb-5 text-sm text-text/70">{t.notificationsSub}</p>
        <dl className="space-y-2" aria-busy={loading}>
          <StatusRow label={t.rotationReminders} on={prefs.rotation} onLabel={t.on} offLabel={t.off} />
          <StatusRow label={t.irrigationReminders} on={prefs.irrigation} onLabel={t.on} offLabel={t.off} />
        </dl>
        <p className="mt-5 text-xs text-text/60">{t.manageInWorkspace}</p>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  on,
  onLabel,
  offLabel,
}: {
  label: string;
  on: boolean;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-surface-3 px-4 py-3">
      <dt className="font-mono text-sm">{label}</dt>
      <dd
        className={
          on
            ? "inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-accent"
            : "inline-flex items-center gap-1.5 font-mono text-sm text-text/50"
        }
      >
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${on ? "bg-accent" : "bg-line"}`} />
        {on ? onLabel : offLabel}
      </dd>
    </div>
  );
}
