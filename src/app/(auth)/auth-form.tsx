"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";

export function AuthForm({ kind }: { kind: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const res =
      kind === "sign-up"
        ? await signUp.email({ email, password, name: String(f.get("name") ?? "").trim() || email.split("@")[0] })
        : await signIn.email({ email, password });
    if (res.error) {
      setError(res.error.message ?? "That did not work. Try again.");
      setBusy(false);
      return;
    }
    const next = params.get("next");
    // The signed-in layout sends a supervisor wherever they belong.
    router.push(next && next.startsWith("/") ? next : "/counter");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {kind === "sign-up" && (
        <label className="block">
          <span className="mb-2 block font-bold">Full name</span>
          <input name="name" className="field" autoComplete="name" required />
        </label>
      )}
      <label className="block">
        <span className="mb-2 block font-bold">Work email</span>
        <input name="email" type="email" className="field" autoComplete="username" required autoFocus />
      </label>
      <label className="block">
        <span className="mb-2 block font-bold">Password</span>
        <input
          name="password"
          type="password"
          className="field"
          autoComplete={kind === "sign-up" ? "new-password" : "current-password"}
          minLength={8}
          required
        />
        {kind === "sign-up" && <span className="mt-2 block text-[0.9rem] text-muted">At least 8 characters.</span>}
      </label>
      <p role="alert" className="min-h-[1.5rem] font-bold text-stop">
        {error}
      </p>
      <button type="submit" className="btn btn-act w-full" disabled={busy}>
        {busy ? "One moment" : kind === "sign-up" ? "Create clerk account" : "Sign in"}
      </button>
      <p className="pt-1 text-center text-muted">
        {kind === "sign-up" ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="link text-ink">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New at the counter?{" "}
            <Link href="/sign-up" className="link text-ink">
              Create a clerk account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
