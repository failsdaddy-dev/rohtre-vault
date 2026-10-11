"use client";

// Email + password sign-in. If the account has an authenticator app (the
// admin), a second step asks for its 6-digit code. The code is asked once
// per sign-in: a visitor who is already signed in (and verified) is sent
// straight on, and one who signed in but hasn't entered the code yet goes
// straight to the code step.

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, KeyIcon, LockIcon, MailIcon } from "@/components/icons";
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
  const [step, setStep] = useState<"password" | "code">("password");
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
      const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!live) return;
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        setStep("code");
        setChecking(false);
      } else {
        router.replace(next);
        router.refresh();
      }
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
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    setBusy(false);
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") setStep("code");
    else finish();
  };

  // Signed in with the password but on someone else's phone? Start over.
  const useOtherAccount = async () => {
    await supabaseBrowser().auth.signOut();
    setError(null);
    setStep("password");
  };

  const verify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    setBusy(true);
    const sb = supabaseBrowser();
    const { data: factors } = await sb.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];
    if (!totp) {
      setBusy(false);
      return finish();
    }
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
    setBusy(false);
    if (error) setError("That code didn’t work. Check the time on your phone and try again.");
    else finish();
  };

  if (checking) return null;

  return (
    <form
      key={step}
      autoComplete={step === "code" ? "off" : undefined}
      onSubmit={step === "password" ? signIn : verify}
      className="flex flex-col gap-5"
    >
      {step === "password" ? (
        <>
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
        </>
      ) : (
        <>
          <div>
            <span className="grid size-12 place-items-center rounded-2xl bg-brand/12 text-brand">
              <KeyIcon size={22} />
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em]">Enter your code</h1>
            <p className="mt-1.5 text-sm text-fg-2">Open your authenticator app and type the 6-digit code for RohTre Vault.</p>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            6-digit code
            <input
              name="code"
              type="text"
              inputMode="numeric"
              maxLength={7}
              data-1p-ignore
              data-lpignore="true"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              required
              autoFocus
              placeholder="000000"
              className="vh-field h-14 rounded-2xl border border-[var(--search-border)] bg-[var(--search-bg)] px-4 text-center font-mono text-2xl tracking-[0.5em] outline-none placeholder:text-fg-2/40"
            />
          </label>
        </>
      )}

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
        {busy ? "Checking…" : step === "password" ? "Sign in" : "Verify"}
        {!busy && <ArrowRightIcon size={18} strokeWidth={2.2} />}
      </button>
      {step === "code" && (
        <button type="button" onClick={useOtherAccount} className="-mt-2 text-sm text-fg-2 underline-offset-4 hover:text-fg hover:underline">
          Use a different account
        </button>
      )}
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
