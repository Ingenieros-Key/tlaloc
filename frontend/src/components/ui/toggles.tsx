"use client";

import { Moon, Sun } from "lucide-react";
import { useLang, setLang, type Lang } from "@/lib/i18n-store";
import { useTheme, applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function LangToggle({ className }: { className?: string }) {
  const lang = useLang();
  return (
    <div className={cn("inline-flex overflow-hidden rounded-full border border-line font-mono text-xs", className)} role="group" aria-label="Language">
      {(["es", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "px-2.5 py-1 uppercase tracking-wide transition-colors",
            lang === l ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-text",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  return (
    <button
      type="button"
      onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-text transition-colors hover:bg-surface-3",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
    </button>
  );
}
