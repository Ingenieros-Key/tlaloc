"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { signIn, signUp, confirmSignUp } from "aws-amplify/auth";
import "@/lib/amplify";
import { authCopy } from "./i18n";
import { useLang } from "@/lib/i18n-store";

type Mode = "signin" | "signup" | "confirm";

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
        <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
      </>
    )}
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

function BrandPanel() {
  return (
    <div className="relative hidden w-2/5 shrink-0 overflow-hidden bg-[#0B1033] md:block">
      <img
        src="/tlaloc-crop-cycle-loop.gif"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

export function AuthModal({
  open,
  onClose,
  onAuthed,
}: {
  open: boolean;
  onClose: () => void;
  onAuthed: () => void;
}) {
  const lang = useLang();
  const t = authCopy[lang];
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirm: "", code: "" });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const id = setTimeout(() => firstFieldRef.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(id);
    };
  }, [open, onClose]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn({ username: form.email, password: form.password });
        onAuthed();
        onClose();
      } else if (mode === "signup") {
        if (form.password !== form.confirm) throw new Error(t.mismatch);
        await signUp({
          username: form.email,
          password: form.password,
          options: { userAttributes: { email: form.email, given_name: form.firstName, family_name: form.lastName, locale: lang } },
        });
        setMode("confirm");
      } else {
        await confirmSignUp({ username: form.email, confirmationCode: form.code });
        setMode("signin");
        setForm((p) => ({ ...p, code: "", password: "", confirm: "" }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const pwMismatch = mode === "signup" && form.confirm.length > 0 && form.password !== form.confirm;

  const field =
    "w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#1FC8B4] focus:ring-2 focus:ring-[#1FC8B4]/40";

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
            aria-label={mode === "signup" ? t.signUpTitle : mode === "confirm" ? t.confirmTitle : t.signInTitle}
            className="flex h-[34rem] max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <BrandPanel />

            <div className="relative flex-1 overflow-y-auto p-7">
              <button
                type="button"
                onClick={onClose}
                aria-label={t.close}
                className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <CloseIcon />
              </button>

              <div className="flex min-h-full flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={lang + mode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mb-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900">
                    {mode === "signup" ? t.signUpTitle : mode === "confirm" ? t.confirmTitle : t.signInTitle}
                  </h2>
                  {mode === "confirm" && (
                    <p className="mt-1 text-sm text-gray-600">{t.confirmSub(form.email)}</p>
                  )}
                </motion.div>
              </AnimatePresence>

              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="grid grid-cols-2 gap-3">
                    <input ref={firstFieldRef} className={field} placeholder={t.firstName} autoComplete="given-name" required value={form.firstName} onChange={set("firstName")} />
                    <input className={field} placeholder={t.lastName} autoComplete="family-name" required value={form.lastName} onChange={set("lastName")} />
                  </div>
                )}

                {mode !== "confirm" && (
                  <input
                    ref={mode === "signin" ? firstFieldRef : undefined}
                    className={field}
                    type="email"
                    placeholder={t.email}
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={set("email")}
                  />
                )}

                {mode === "confirm" && (
                  <input ref={firstFieldRef} className={field} placeholder={t.code} autoComplete="one-time-code" inputMode="numeric" required value={form.code} onChange={set("code")} />
                )}

                {mode !== "confirm" && (
                  <div className="relative">
                    <input
                      className={`${field} pr-11`}
                      type={showPw ? "text" : "password"}
                      placeholder={t.password}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={set("password")}
                    />
                    <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? t.hidePassword : t.showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 hover:text-gray-700">
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                )}

                {mode === "signup" && (
                  <div>
                    <div className="relative">
                      <input
                        className={`${field} pr-11 ${pwMismatch ? "border-red-400 focus:border-red-400 focus:ring-red-400/40" : ""}`}
                        type={showConfirm ? "text" : "password"}
                        placeholder={t.confirmPassword}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        aria-invalid={pwMismatch}
                        value={form.confirm}
                        onChange={set("confirm")}
                      />
                      <button type="button" onClick={() => setShowConfirm((s) => !s)} aria-label={showConfirm ? t.hidePassword : t.showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 hover:text-gray-700">
                        <EyeIcon open={showConfirm} />
                      </button>
                    </div>
                    {pwMismatch && <p className="mt-1.5 text-xs text-red-600">{t.mismatch}</p>}
                  </div>
                )}

                {error && (
                  <p role="alert" className="text-sm text-red-600">
                    {error}
                  </p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading || pwMismatch}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1033] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#122152] disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <img src="/tlaloc-loader.svg" alt="" aria-hidden className="h-5 w-5" />
                      {t.working}
                    </>
                  ) : mode === "signup" ? (
                    t.submitSignUp
                  ) : mode === "confirm" ? (
                    t.submitConfirm
                  ) : (
                    t.submitSignIn
                  )}
                </motion.button>

                {mode !== "confirm" && (
                  <p className="pt-1 text-center text-sm text-gray-600">
                    {mode === "signup" ? t.signUpSub : t.signInSub}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === "signup" ? "signin" : "signup");
                        setError(null);
                      }}
                      className="font-medium text-[#1FC8B4] hover:underline"
                    >
                      {mode === "signup" ? t.toSignIn : t.toSignUp}
                    </button>
                  </p>
                )}
              </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
