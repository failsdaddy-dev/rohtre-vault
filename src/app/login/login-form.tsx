"use client";

// Email + password sign-in. A visitor who is already signed in on this
// browser is sent straight on.

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "@/components/icons";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { safeNext } from "@/lib/url-state";

const FIELD =
  "vh-field flex h-12 items-center gap-3 rounded-2xl border border-[var(--search-border)] bg-[var(--search-bg)] px-4 font-normal";
const INPUT = "h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-fg-2/60";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(SUPABASE_CONFIGURED);
  const [showPassword, setShowPassword] = useState(false);

  const finish = () => {
    router.replace(next);
    router.refresh();
  };

  // Already signed in on this browser? Don't ask for the password again.
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    let live = true;
    (async () => {
      const sb = supabaseBrowser();
      const { data } = await sb.auth.getSession();
      if (!live) return;
      if (!data.session) return setChecking(false);
      router.replace(next);
      router.refresh();
    })();
    return () => {
      live = false;
    };
  }, [next, router]);

  const signIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!SUPABASE_CONFIGURED) return finish();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    if (error) {
      setBusy(false);
      setError("That email and password don’t match an active account.");
      return;
    }
    finish();
  };

  if (checking) return null;

  return (
    <form onSubmit={signIn} className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">Welcome back</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">Sign in</h1>
        <p className="mt-1.5 text-sm text-fg-2">Use the login your admin gave you.</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email
        <span className={FIELD}>
          <MailIcon size={18} className="shrink-0 text-fg-2" />
          <input type="email" name="email" autoComplete="username" required placeholder="you@studio.com" className={INPUT} />
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Password
        <span className={FIELD}>
          <LockIcon size={18} className="shrink-0 text-fg-2" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••••"
            className={INPUT}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="-mr-2 grid size-8 shrink-0 place-items-center rounded-full text-fg-2 transition-colors hover:bg-hover hover:text-fg"
          >
            {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="vh-press inline-flex h-12 items-center justify-center gap-2 rounded-full bg-chip-on-bg font-semibold text-chip-on-fg hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Checking…" : "Sign in"}
        {!busy && <ArrowRightIcon size={18} strokeWidth={2.2} />}
      </button>
      <p className="border-t border-line pt-4 text-xs leading-5 text-fg-2">
        No public sign-up. Forgot your password or lost access? Ask the admin.
        {!SUPABASE_CONFIGURED && (
          <>
            <br />
            <span className="opacity-80">Sample mode: Supabase isn’t configured, so any input opens the sample library.</span>
          </>
        )}
      </p>
    </form>
  );
}
