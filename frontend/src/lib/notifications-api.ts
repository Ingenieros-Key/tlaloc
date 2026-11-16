"use client";

import { fetchAuthSession } from "aws-amplify/auth";
import { apiUrl } from "@/lib/amplify";

export type NotificationPrefs = {
  readonly rotation: boolean;
  readonly irrigation: boolean;
};

function base(): string {
  return apiUrl.replace(/\/?$/, "/");
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString() ?? "";
  return { Authorization: token, "Content-Type": "application/json" };
}

/** Email-reminder preferences for the signed-in user. Requires a Cognito session. */
export async function getNotifications(): Promise<NotificationPrefs> {
  const res = await fetch(`${base()}notifications`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`GET notifications ${res.status}`);
  return (await res.json()) as NotificationPrefs;
}

/** `locale` is stored so scheduled reminders are sent in the user's UI language. */
export async function saveNotifications(
  prefs: NotificationPrefs & { locale?: string },
): Promise<NotificationPrefs> {
  const res = await fetch(`${base()}notifications`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error(`PUT notifications ${res.status}`);
  return (await res.json()) as NotificationPrefs;
}
