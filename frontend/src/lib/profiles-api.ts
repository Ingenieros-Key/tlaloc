"use client";

import { fetchAuthSession } from "aws-amplify/auth";
import { apiUrl } from "@/lib/amplify";

export type Profile = {
  readonly userId: string;
  readonly email: string;
  readonly displayName?: string;
  readonly bio?: string;
  readonly location?: string;
  readonly avatarKey?: string;
  readonly avatarUrl?: string;
  readonly createdAt?: string;
  readonly updatedAt: string;
};

function base(): string {
  return apiUrl.replace(/\/?$/, "/");
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString() ?? "";
  return { Authorization: token, "Content-Type": "application/json" };
}

export async function getProfile(): Promise<Profile> {
  const res = await fetch(`${base()}profiles/me`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`GET profiles/me ${res.status}`);
  return (await res.json()) as Profile;
}

export async function updateProfile(input: {
  displayName?: string;
  avatarKey?: string;
}): Promise<Profile> {
  const res = await fetch(`${base()}profiles/me`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`PUT profiles/me ${res.status}`);
  return (await res.json()) as Profile;
}

export async function requestAvatarUpload(
  contentType: string,
): Promise<{ uploadUrl: string; key: string }> {
  const res = await fetch(`${base()}profiles/me/avatar`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ contentType }),
  });
  if (!res.ok) throw new Error(`POST profiles/me/avatar ${res.status}`);
  return (await res.json()) as { uploadUrl: string; key: string };
}

/** Presign, PUT the blob straight to S3, then persist the key on the profile. */
export async function uploadAvatar(blob: Blob): Promise<Profile> {
  const contentType = blob.type || "image/jpeg";
  const { uploadUrl, key } = await requestAvatarUpload(contentType);
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!put.ok) throw new Error(`PUT avatar ${put.status}`);
  return updateProfile({ avatarKey: key });
}
