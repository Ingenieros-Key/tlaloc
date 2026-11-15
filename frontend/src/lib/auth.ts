"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, fetchUserAttributes, signOut as amplifySignOut } from "aws-amplify/auth";
import "@/lib/amplify";

export type AuthStatus = "loading" | "in" | "out";

export interface AuthProfile {
  status: AuthStatus;
  firstName?: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuthProfile(): AuthProfile {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [firstName, setFirstName] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    try {
      await getCurrentUser();
      let name: string | undefined;
      try {
        const attrs = await fetchUserAttributes();
        name = attrs.given_name;
      } catch {
        /* attributes optional */
      }
      setFirstName(name);
      setStatus("in");
    } catch {
      setStatus("out");
      setFirstName(undefined);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await amplifySignOut();
    } catch {
      /* ignore */
    }
    setStatus("out");
    setFirstName(undefined);
  }, []);

  return { status, firstName, refresh, signOut };
}
