"use client";

import { useEffect } from "react";
import { applyTheme, readStoredTheme } from "@/lib/theme";

/** Applies the stored theme to <html> on first load so every route starts themed. */
export function ThemeInit(): null {
  useEffect(() => {
    applyTheme(readStoredTheme());
  }, []);
  return null;
}
