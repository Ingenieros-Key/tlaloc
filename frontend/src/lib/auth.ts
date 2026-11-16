"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getCurrentUser, fetchUserAttributes, signOut as amplifySignOut } from "aws-amplify/auth";
import "@/lib/amplify";

export type AuthStatus = "loading" | "in" | "out";

interface AuthState {
  status: AuthStatus;
  firstName?: string;
}

export interface AuthProfile extends AuthState {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const LOADING: AuthState = { status: "loading" };

// Single shared auth state so the nav, the hero and any other consumer stay in sync
// (e.g. the home hero flips to the signed-in view the moment the modal signs in).
let state: AuthState = LOADING;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export async function refreshAuth(): Promise<void> {
  try {
    await getCurrentUser();
    let firstName: string | undefined;
    try {
      firstName = (await fetchUserAttributes()).given_name;
    } catch {
      /* attributes optional */
    }
    state = { status: "in", firstName };
  } catch {
    state = { status: "out" };
  }
  emit();
}

async function signOut(): Promise<void> {
  try {
    await amplifySignOut();
  } catch {
    /* ignore */
  }
  state = { status: "out" };
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAuthProfile(): AuthProfile {
  const snap = useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
  useEffect(() => {
    if (!started) {
      started = true;
      refreshAuth();
    }
  }, []);
  return { ...snap, refresh: refreshAuth, signOut };
}
