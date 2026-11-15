export type Theme = "dark" | "light";

const KEY = "tl-theme";

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(KEY) === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("tl-light-theme", theme === "light");
  }
  if (typeof window !== "undefined") localStorage.setItem(KEY, theme);
}
