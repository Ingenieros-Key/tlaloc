"use client";

import { useSyncExternalStore } from "react";

export type Lang = "en" | "es";

const KEY = "tl-lang";
const listeners = new Set<() => void>();

function detect(): Lang {
  if (typeof navigator === "undefined") return "es";
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

export function currentLang(): Lang {
  if (typeof window === "undefined") return "es";
  const v = localStorage.getItem(KEY);
  return v === "en" || v === "es" ? v : detect();
}

export function setLang(lang: Lang): void {
  if (typeof window !== "undefined") localStorage.setItem(KEY, lang);
  listeners.forEach((fn) => fn());
}

export function toggleLang(): void {
  setLang(currentLang() === "es" ? "en" : "es");
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, currentLang, () => "es");
}
