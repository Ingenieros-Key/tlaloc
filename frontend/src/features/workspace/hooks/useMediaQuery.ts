"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Below this query the Browser and Inspector are off-canvas drawers (Tailwind `max-lg`). */
export const DRAWER_QUERY = "(max-width: 1023.98px)";

/** Live `matchMedia` result; false during prerender. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
