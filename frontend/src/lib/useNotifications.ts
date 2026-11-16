"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuthProfile } from "@/lib/auth";
import { useLang } from "@/lib/i18n-store";
import {
  getNotifications,
  saveNotifications,
  type NotificationPrefs,
} from "@/lib/notifications-api";

interface Store {
  prefs: NotificationPrefs;
  loading: boolean;
}

// Shared across every consumer (workspace toggles + the notifications overview) so a change in one
// place is reflected everywhere without refetching.
let store: Store = { prefs: { rotation: false, irrigation: false }, loading: true };
let loaded = false;
const listeners = new Set<() => void>();

function set(next: Partial<Store>): void {
  store = { ...store, ...next };
  listeners.forEach((fn) => fn());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function load(): void {
  // ponytail: loads once per page life; a sign-out/in as a different user keeps stale prefs until
  // reload. Reset on the auth store's sign-out event if multi-user sessions ever matter.
  if (loaded) return;
  loaded = true;
  set({ loading: true });
  getNotifications()
    .then((p) => set({ prefs: { rotation: p.rotation, irrigation: p.irrigation }, loading: false }))
    .catch(() => set({ loading: false }));
}

async function persist(next: NotificationPrefs, locale: string): Promise<void> {
  const prev = store.prefs;
  set({ prefs: next });
  try {
    await saveNotifications({ ...next, locale });
  } catch {
    set({ prefs: prev });
  }
}

export interface Notifications {
  readonly prefs: NotificationPrefs;
  /** Initial fetch in flight; toggles are ignored until it settles. Never blocks after that. */
  readonly loading: boolean;
  readonly signedIn: boolean;
  setPref: (key: keyof NotificationPrefs, value: boolean) => void;
}

/**
 * Email-reminder prefs for the signed-in user. Optimistic: a toggle applies immediately and only
 * reverts if the save fails — controls are never left stuck disabled.
 */
export function useNotifications(): Notifications {
  const { status } = useAuthProfile();
  const lang = useLang();
  const snap = useSyncExternalStore(subscribe, () => store, () => store);
  const signedIn = status === "in";

  useEffect(() => {
    if (signedIn) load();
  }, [signedIn]);

  return {
    prefs: snap.prefs,
    loading: snap.loading,
    signedIn,
    setPref: (key, value) => {
      if (!signedIn || store.loading) return;
      void persist({ ...store.prefs, [key]: value }, lang);
    },
  };
}
