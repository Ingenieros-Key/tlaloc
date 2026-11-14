"use client";
import { useState } from "react";
import { signUp, confirmSignUp } from "aws-amplify/auth";
import "@/lib/amplify";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"form" | "confirm">("form");
  const [error, setError] = useState<string | null>(null);

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signUp({ username: email, password, options: { userAttributes: { email } } });
      setStage("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    }
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      window.location.href = "/sign-in";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    }
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-4 text-xl font-semibold">Create your Tlaloc account</h1>
      {stage === "form" ? (
        <form onSubmit={onSignUp} className="flex flex-col gap-3">
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
              autoComplete="new-password"
              required
              minLength={8}
              aria-describedby="password-hint"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p id="password-hint" className="text-xs text-gray-600">
              At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a symbol (e.g. !@#$%).
            </p>
          </div>
          <button className="bg-black p-2 text-white" type="submit">
            Sign up
          </button>
        </form>
      ) : (
        <form onSubmit={onConfirm} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="code" className="text-sm font-medium">
              Confirmation code
            </label>
            <input
              id="code"
              className="border p-2"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <button className="bg-black p-2 text-white" type="submit">
            Confirm
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
