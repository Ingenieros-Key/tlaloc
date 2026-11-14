"use client";
import { useState } from "react";
import { signIn } from "aws-amplify/auth";
import "@/lib/amplify";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signIn({ username: email, password });
      window.location.href = "/profile";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    }
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-4 text-xl font-semibold">Sign in to Tlaloc</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            className="border p-2"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            className="border p-2"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="bg-black p-2 text-white" type="submit">
          Sign in
        </button>
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
