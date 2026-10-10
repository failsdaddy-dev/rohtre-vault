"use client";

// Stage 1: layout only. Stage 3 connects this to Supabase Auth
// (email + password, then the admin's authenticator code).

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Wordmark } from "@/components/top-bar";

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    router.push("/effects");
  };

  return (
    <form
      onSubmit={submit}
      className="vh-pop-in flex w-full max-w-[400px] flex-col gap-5 rounded-2xl border border-line bg-bg-elev p-8 max-sm:border-0 max-sm:p-4"
    >
      <Wordmark />
      <div>
        <h1 className="text-2xl font-normal">Sign in</h1>
        <p className="mt-1 text-sm text-fg-2">Use the login your admin gave you.</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        Email
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          className="h-11 rounded-lg border border-[var(--search-border)] bg-[var(--search-bg)] px-3 text-base outline-none focus:border-focus"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-lg border border-[var(--search-border)] bg-[var(--search-bg)] px-3 text-base outline-none focus:border-focus"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="vh-press h-10 rounded-full bg-chip-on-bg font-medium text-chip-on-fg hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs leading-5 text-fg-2">
        No public sign-up. Forgot your password or lost access? Ask the admin.
        <br />
        <span className="opacity-80">Sample screen: sign-in is connected in Stage 3.</span>
      </p>
    </form>
  );
}
