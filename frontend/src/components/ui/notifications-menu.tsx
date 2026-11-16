"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useLang } from "@/lib/i18n-store";
import { cn } from "@/lib/utils";
import { navCopy } from "./i18n";
import {
  getNotifications,
  saveNotifications,
  type NotificationPrefs,
} from "@/lib/notifications-api";

/** Email-reminder preferences dialog, opened from the signed-in user menu. */
export function NotificationsMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const lang = useLang();
  const t = navCopy[lang];
  const [prefs, setPrefs] = useState<NotificationPrefs>({ rotation: false, irrigation: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifications()
      .then((p) => setPrefs({ rotation: p.rotation, irrigation: p.irrigation }))
      .catch(() => {})
      .finally(() => setLoading(false));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function toggle(key: keyof NotificationPrefs) {
    const prev = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setBusy(true);
    try {
      await saveNotifications({ ...next, locale: lang });
    } catch {
      setPrefs(prev);
    } finally {
      setBusy(false);
    }
  }

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
        <div className="space-y-2">
          <ToggleRow
            label={t.rotationReminders}
            checked={prefs.rotation}
            disabled={loading || busy}
            onToggle={() => toggle("rotation")}
          />
          <ToggleRow
            label={t.irrigationReminders}
            checked={prefs.irrigation}
            disabled={loading || busy}
            onToggle={() => toggle("irrigation")}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-surface-3 px-4 py-3">
      <span className="font-mono text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-line",
          disabled && "opacity-50",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
