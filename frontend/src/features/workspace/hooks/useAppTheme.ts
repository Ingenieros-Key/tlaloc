"use client";

import { useSyncExternalStore } from "react";
import { currentTheme, subscribeTheme, type Theme } from "@/lib/theme";

/** Live app theme (dark/light) as toggled in the top bar; "dark" during prerender. */
export function useAppTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, currentTheme, () => "dark");
}
