"use client";

// Email + password sign-in. If the account has an authenticator app (the
// admin), a second step asks for its 6-digit code.

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Wordmark } from "@/components/top-bar";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { safeNext } from "@/lib/url-state";

const INPUT =
  "h-11 rounded-lg border border-[var(--search-border)] bg-[var(--search-bg)] px-3 text-base outline-none focus:border-focus";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [step, setStep] = useState<"password" | "code">("password");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = () => {
    router.replace(next);
    router.refresh();
  };

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

  return (
    <form
      onSubmit={step === "password" ? signIn : verify}
      className="vh-pop-in flex w-full max-w-[400px] flex-col gap-5 rounded-2xl border border-line bg-bg-elev p-8 max-sm:border-0 max-sm:p-4"
    >
      <Wordmark />
      {step === "password" ? (
        <>
          <div>
            <h1 className="text-2xl font-normal">Sign in</h1>
            <p className="mt-1 text-sm text-fg-2">Use the login your admin gave you.</p>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            Email
            <input type="email" name="email" autoComplete="username" required className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Password
            <input type="password" name="password" autoComplete="current-password" required className={INPUT} />
          </label>
        </>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-normal">Enter your code</h1>
            <p className="mt-1 text-sm text-fg-2">Open your authenticator app and type the 6-digit code for RohTre Vault.</p>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            6-digit code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              required
              autoFocus
              className={`${INPUT} tracking-[0.3em]`}
            />
          </label>
        </>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="vh-press h-10 rounded-full bg-chip-on-bg font-medium text-chip-on-fg hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Checking…" : step === "password" ? "Sign in" : "Verify"}
      </button>
      <p className="text-xs leading-5 text-fg-2">
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
