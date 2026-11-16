"use client";

import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, type Query } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState, type ReactNode } from "react";

/** How long cached answers survive, in memory and in localStorage. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Bump to throw away every persisted cache, e.g. after changing the shape of cached data. */
const CACHE_BUSTER = "1";
const STORAGE_KEY = "tlaloc-query-cache";

/** Persist only successful external-data queries (NASA POWER), never user or auth data. */
const PERSISTED_ROOTS = new Set(["nasa-power"]);

function shouldPersist(query: Query): boolean {
  return query.state.status === "success" && PERSISTED_ROOTS.has(String(query.queryKey[0]));
}

/** localStorage when it exists and is usable (absent during prerender, may throw in private modes). */
function browserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * TanStack Query for the app, with selected queries saved to localStorage so a reload shows them
 * immediately and only refreshes what has gone stale.
 */
export function QueryProvider({ children }: { readonly children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { gcTime: MAX_AGE_MS, refetchOnWindowFocus: false } },
      }),
  );
  const [persister] = useState(() =>
    createAsyncStoragePersister({ storage: browserStorage(), key: STORAGE_KEY }),
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: MAX_AGE_MS,
        buster: CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersist },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
