"use client";
import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { apiUrl } from "@/lib/amplify";

export default function ProfilePage() {
  const [profile, setProfile] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString() ?? "";
        const base = apiUrl.replace(/\/?$/, "/");
        const res = await fetch(`${base}profiles/me`, { headers: { Authorization: token } });
        if (!res.ok) throw new Error(`API ${res.status}`);
        setProfile(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-4 text-xl font-semibold">Your profile</h1>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <pre className="bg-gray-100 p-4 text-sm">{JSON.stringify(profile, null, 2)}</pre>
    </main>
  );
}
