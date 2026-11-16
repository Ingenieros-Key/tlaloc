"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { fetchUserAttributes, updatePassword } from "aws-amplify/auth";
import "@/lib/amplify";
import { profileCopy } from "./i18n";
import { useLang } from "@/lib/i18n-store";
import { getProfile, updateProfile, uploadAvatar, type Profile } from "@/lib/profiles-api";

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const VIEWPORT = 240;
const OUTPUT = 512;

function initials(name?: string, email?: string): string {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2);
  return letters.toUpperCase();
}

function AvatarAdjuster({
  file,
  onCancel,
  onSave,
  t,
}: {
  file: File;
  onCancel: () => void;
  onSave: (blob: Blob) => Promise<void>;
  t: (typeof profileCopy)["en"];
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const base = img ? Math.max(VIEWPORT / img.width, VIEWPORT / img.height) : 1;
  const dw = img ? img.width * base * zoom : 0;
  const dh = img ? img.height * base * zoom : 0;
  const left = (VIEWPORT - dw) / 2 + offset.x;
  const top = (VIEWPORT - dh) / 2 + offset.y;

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function save() {
    if (!img || saving) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      const f = OUTPUT / VIEWPORT;
      ctx.drawImage(img, left * f, top * f, dw * f, dh * f);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("toBlob failed");
      await onSave(blob);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-mono text-xs uppercase tracking-wide text-muted">{t.adjustTitle}</p>
      <div
        className="relative overflow-hidden rounded-full border border-line bg-surface-3 touch-none"
        style={{ width: VIEWPORT, height: VIEWPORT, cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.src}
            alt=""
            aria-hidden
            draggable={false}
            style={{ position: "absolute", left, top, width: dw, height: dh, maxWidth: "none" }}
          />
        )}
      </div>
      <label className="flex w-full items-center gap-3">
        <span className="font-mono text-xs text-muted">{t.zoom}</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-accent"
        />
      </label>
      <div className="flex w-full gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-xl border border-line py-2.5 font-mono text-sm text-text transition-colors hover:bg-surface-3 disabled:opacity-60"
        >
          {t.cancel}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !img}
          className="flex-1 rounded-xl bg-accent py-2.5 font-mono text-sm text-on-accent transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? t.working : t.save}
        </button>
      </div>
    </div>
  );
}

function ProfileSection({
  profile,
  email,
  onProfileChange,
  t,
  lang,
}: {
  profile: Profile | null;
  email: string;
  onProfileChange: (p: Profile) => void;
  t: (typeof profileCopy)["en"];
  lang: "en" | "es";
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [name, setName] = useState(profile?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(profile?.displayName ?? "");
  }, [profile?.displayName]);

  const memberSince =
    profile?.createdAt &&
    new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(new Date(profile.createdAt));

  async function saveName() {
    const trimmed = name.trim();
    if (savingName || trimmed === (profile?.displayName ?? "")) return;
    setSavingName(true);
    setError(null);
    try {
      onProfileChange(await updateProfile({ displayName: trimmed }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingName(false);
    }
  }

  async function onAvatarSaved(blob: Blob) {
    setError(null);
    try {
      onProfileChange(await uploadAvatar(blob));
      setPendingFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  if (pendingFile) {
    return (
      <AvatarAdjuster
        file={pendingFile}
        onCancel={() => setPendingFile(null)}
        onSave={onAvatarSaved}
        t={t}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-col items-center gap-3">
        <div className="h-28 w-28 overflow-hidden rounded-full border border-line bg-surface-3">
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-3xl text-muted">
              {initials(profile?.displayName, email)}
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPendingFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-line px-4 py-1.5 font-mono text-xs text-text transition-colors hover:bg-surface-3"
        >
          {profile?.avatarUrl ? t.changePhoto : t.uploadPhoto}
        </button>
      </div>

      <div className="w-full space-y-4">
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">{t.displayName}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            placeholder={t.displayNamePlaceholder}
            maxLength={80}
            className="mt-1 w-full rounded-xl border border-line bg-surface-3 px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
          />
        </label>

        <div>
          <span className="font-mono text-xs uppercase tracking-wide text-muted">{t.email}</span>
          <p className="mt-1 text-sm text-text">{email || "—"}</p>
        </div>

        <div>
          <span className="font-mono text-xs uppercase tracking-wide text-muted">{t.memberSince}</span>
          <p className="mt-1 text-sm text-text">{memberSince || "—"}</p>
        </div>

        {(savingName || error) && (
          <p className={`text-xs ${error ? "text-red-500" : "text-muted"}`} role={error ? "alert" : undefined}>
            {error ?? t.working}
          </p>
        )}
      </div>
    </div>
  );
}

function PasswordSection({ t }: { t: (typeof profileCopy)["en"] }) {
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setLoading(true);
    try {
      await updatePassword({ oldPassword, newPassword });
      setDone(true);
      setOld("");
      setNew("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "mt-1 w-full rounded-xl border border-line bg-surface-3 px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/40";

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="font-mono text-xs uppercase tracking-wide text-muted">{t.currentPassword}</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={oldPassword}
          onChange={(e) => setOld(e.target.value)}
          className={field}
        />
      </label>
      <label className="block">
        <span className="font-mono text-xs uppercase tracking-wide text-muted">{t.newPassword}</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          className={field}
        />
      </label>

      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
      {done && <p className="text-xs text-accent">{t.passwordChanged}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-accent py-2.5 font-mono text-sm text-on-accent transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? t.working : t.changePassword}
      </button>
    </form>
  );
}

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLang();
  const t = profileCopy[lang];
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"profile" | "password">("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTab("profile");
    (async () => {
      try {
        const [p, attrs] = await Promise.all([getProfile(), fetchUserAttributes()]);
        setProfile(p);
        setEmail(attrs.email ?? p.email ?? "");
      } catch {
        /* keep placeholders */
      }
    })();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const tabBtn = (id: "profile" | "password", label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex-1 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
        tab === id ? "bg-accent text-on-accent" : "text-muted hover:text-text"
      }`}
    >
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t.title}
            className="flex h-[36rem] max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="font-display text-xl text-text">{t.title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.close}
                className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-3 hover:text-text"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex gap-1.5 border-b border-line px-6 py-3">
              {tabBtn("profile", t.tabProfile)}
              {tabBtn("password", t.tabPassword)}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {tab === "profile" ? (
                <ProfileSection
                  profile={profile}
                  email={email}
                  onProfileChange={setProfile}
                  t={t}
                  lang={lang}
                />
              ) : (
                <PasswordSection t={t} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
