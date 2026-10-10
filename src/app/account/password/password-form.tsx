"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Wordmark } from "@/components/top-bar";
import { supabaseBrowser } from "@/lib/supabase/client";

const INPUT =
  "h-11 rounded-lg border border-[var(--search-border)] bg-[var(--search-bg)] px-3 text-base outline-none focus:border-focus";
export const MIN_PASSWORD = 10;

export function PasswordForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== form.get("confirm")) return setError("The two passwords don’t match.");
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.updateUser({ password });
    if (!error) await sb.rpc("mark_password_changed");
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/effects");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="vh-pop-in flex w-full max-w-[400px] flex-col gap-5 rounded-2xl border border-line bg-bg-elev p-8 max-sm:border-0 max-sm:p-4">
      <Wordmark />
      <div>
        <h1 className="text-2xl font-normal">Set your own password</h1>
        <p className="mt-1 text-sm text-fg-2">Your admin gave you a temporary one. Choose a new password to continue.</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        New password
        <input type="password" name="password" autoComplete="new-password" minLength={MIN_PASSWORD} required className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Type it again
        <input type="password" name="confirm" autoComplete="new-password" minLength={MIN_PASSWORD} required className={INPUT} />
      </label>
      {error && <p role="alert" className="rounded-lg bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] px-3 py-2 text-sm">{error}</p>}
      <button type="submit" disabled={busy} className="vh-press h-10 rounded-full bg-chip-on-bg font-medium text-chip-on-fg hover:opacity-90 disabled:opacity-60">
        {busy ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}
