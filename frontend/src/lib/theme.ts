import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const KEY = "tl-theme";
const LIGHT_CLASS = "tl-light-theme";

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(KEY) === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle(LIGHT_CLASS, theme === "light");
  }
  if (typeof window !== "undefined") localStorage.setItem(KEY, theme);
}


/** The theme currently applied to <html> (the source of truth `applyTheme` writes). */
export function currentTheme(): Theme {
  return document.documentElement.classList.contains(LIGHT_CLASS) ? "light" : "dark";
}

/** Calls `onChange` whenever the applied theme may have changed. Returns an unsubscribe. */
export function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function toggleTheme(): void {
  applyTheme(currentTheme() === "dark" ? "light" : "dark");
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, currentTheme, () => "dark");
}
