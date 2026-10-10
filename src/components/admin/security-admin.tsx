"use client";

// Admin 2FA (authenticator app). Admin features stay locked until the
// session is verified with a code (aal2), enforced by the database.
// verified: https://supabase.com/docs/guides/auth/auth-mfa

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AdminFrame, Button, ErrorNote, Input, Panel } from "./ui";

type State =
  | { kind: "loading" }
  | { kind: "on" }
  | { kind: "verify"; factorId: string }
  | { kind: "none" }
  | { kind: "enrolling"; factorId: string; qr: string; secret: string };

/** Supabase returns "data:image/svg+xml;utf-8,<svg…>
"; encode it into a valid data URL. */
function qrSrc(raw: string): string {
  const trimmed = raw.trim();
  const comma = trimmed.indexOf(",");
  if (trimmed.startsWith("data:image/svg+xml") && comma > 0) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed.slice(comma + 1).trim())}`;
  }
  return trimmed;
}

export function SecurityAdmin() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [{ data: factors }, { data: aal }] = await Promise.all([
      sb.auth.mfa.listFactors(),
      sb.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    const verified = factors?.totp?.find((f) => f.status === "verified");
    if (verified && aal?.currentLevel === "aal2") setState({ kind: "on" });
    else if (verified) setState({ kind: "verify", factorId: verified.id });
    else setState({ kind: "none" });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads external auth state once
    load();
  }, [load]);

  const enroll = async () => {
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    // Remove half-finished attempts first.
    const { data: factors } = await sb.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "RohTre Vault" });
    setBusy(false);
    if (error || !data) return setError(error?.message ?? "Couldn’t start setup. Check that TOTP MFA is enabled in Supabase.");
    setState({ kind: "enrolling", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async (e: FormEvent<HTMLFormElement>, factorId: string) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) return setError("That code didn’t work. Check the time on your phone and try again.");
    setState({ kind: "on" });
    router.refresh();
  };

  const codeForm = (factorId: string, label: string) => (
    <form onSubmit={(e) => verify(e, factorId)} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">6-digit code</span>
        <Input name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className="w-40 tracking-[0.3em]" />
      </label>
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Checking…" : label}
      </Button>
    </form>
  );

  return (
    <AdminFrame title="Two-factor sign-in">
      <Panel className="flex max-w-2xl flex-col gap-4">
        {state.kind === "loading" && <p className="text-fg-2">Checking…</p>}
        {state.kind === "on" && (
          <>
            <p className="font-medium">2FA is on for your account.</p>
            <p className="text-sm text-fg-2">Admin tools are unlocked for this session. Each new sign-in asks for a code.</p>
          </>
        )}
        {state.kind === "verify" && (
          <>
            <p className="font-medium">Enter a code to unlock admin tools</p>
            <p className="text-sm text-fg-2">Open your authenticator app and type the code for RohTre Vault.</p>
            {codeForm(state.factorId, "Unlock")}
          </>
        )}
        {state.kind === "none" && (
          <>
            <p className="font-medium">Set up an authenticator app</p>
            <p className="text-sm text-fg-2">
              Admin tools need a second step at sign-in. Use any authenticator app (Google Authenticator, Microsoft
              Authenticator, 1Password…).
            </p>
            <div>
              <Button variant="primary" onClick={enroll} disabled={busy}>
                {busy ? "Starting…" : "Set up 2FA"}
              </Button>
            </div>
          </>
        )}
        {state.kind === "enrolling" && (
          <>
            <p className="font-medium">1. Scan this code with your authenticator app</p>
            <div className="w-fit rounded-xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data from Supabase, not a remote image */}
              <img src={qrSrc(state.qr)} alt="QR code for your authenticator app" width={180} height={180} />
            </div>
            <p className="text-sm text-fg-2">
              Can’t scan? Enter this key instead: <code className="select-all break-all">{state.secret}</code>
            </p>
            <p className="font-medium">2. Type the 6-digit code it shows</p>
            {codeForm(state.factorId, "Turn on 2FA")}
          </>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
      </Panel>
    </AdminFrame>
  );
}
