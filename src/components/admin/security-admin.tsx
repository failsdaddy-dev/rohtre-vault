"use client";

// Admin 2FA switch.
//   ON  -> every admin sign-in needs the 6-digit code; admin tools need it too.
//   OFF -> the admin password alone opens the admin tools.
// "New QR code" sets up a fresh authenticator entry and removes the old one
// only after the new one is verified, so you can never lock yourself out.
// Turning 2FA off needs a code-verified session (Supabase rule), so a stolen
// password can't switch it off.
// verified: https://supabase.com/docs/guides/auth/auth-mfa

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "../toast";
import { AdminFrame, Badge, Button, ErrorNote, Input, Panel } from "./ui";

type State =
  | { kind: "loading" }
  | { kind: "on" }
  | { kind: "off" }
  | { kind: "locked"; factorId: string } // 2FA on, but this session hasn't entered a code
  | { kind: "enrolling"; factorId: string; qr: string; secret: string; replacing: boolean };

/** Supabase returns "data:image/svg+xml;utf-8,<svg…>\n"; encode it into a valid data URL. */
function qrSrc(raw: string): string {
  const trimmed = raw.trim();
  const comma = trimmed.indexOf(",");
  if (trimmed.startsWith("data:image/svg+xml") && comma > 0) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed.slice(comma + 1).trim())}`;
  }
  return trimmed;
}

function StatusSwitch({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Two-factor sign-in"
      onClick={onClick}
      disabled={disabled}
      className={`relative h-8 w-14 shrink-0 rounded-full disabled:opacity-50 ${on ? "bg-brand" : "bg-chip-hover"}`}
    >
      <span
        className={`absolute left-1 top-1 size-6 rounded-full bg-white shadow transition-transform duration-[var(--dur-2)] ease-[var(--ease)] ${
          on ? "translate-x-6" : ""
        }`}
      />
    </button>
  );
}

export function SecurityAdmin() {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [{ data: factors }, { data: aal }] = await Promise.all([
      sb.auth.mfa.listFactors(),
      sb.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    const verified = factors?.totp?.find((f) => f.status === "verified");
    if (!verified) setState({ kind: "off" });
    else if (aal?.currentLevel === "aal2") setState({ kind: "on" });
    else setState({ kind: "locked", factorId: verified.id });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads external auth state once
    load();
  }, [load]);

  /** Starts a new authenticator entry (first time, or a fresh QR code). */
  const startEnroll = async (replacing: boolean) => {
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    const { data: factors } = await sb.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await sb.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `RohTre Vault ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    });
    setBusy(false);
    if (error || !data) return setError(error?.message ?? "Couldn’t start setup. Check that TOTP MFA is enabled in Supabase.");
    setState({ kind: "enrolling", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret, replacing });
  };

  const cancelEnroll = async (factorId: string) => {
    await supabaseBrowser().auth.mfa.unenroll({ factorId });
    await load();
  };

  const verify = async (e: FormEvent<HTMLFormElement>, factorId: string, replacing: boolean) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) {
      setBusy(false);
      return setError("That code didn’t work. Check the time on your phone and try again.");
    }
    if (replacing) {
      // The new entry works, so the old QR code can go.
      const { data: factors } = await sb.auth.mfa.listFactors();
      for (const f of factors?.totp ?? []) {
        if (f.id !== factorId && f.status === "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    setBusy(false);
    setState({ kind: "on" });
    toast(replacing ? "New QR code is active. The old one no longer works." : "2FA is on");
    router.refresh();
  };

  const turnOff = async () => {
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    const { data: factors } = await sb.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      const { error } = await sb.auth.mfa.unenroll({ factorId: f.id });
      if (error) {
        setBusy(false);
        return setError(`Couldn’t turn 2FA off: ${error.message}`);
      }
    }
    await sb.auth.refreshSession();
    setBusy(false);
    setConfirmOff(false);
    setState({ kind: "off" });
    toast("2FA is off");
    router.refresh();
  };

  const codeForm = (factorId: string, label: string, replacing: boolean) => (
    <form onSubmit={(e) => verify(e, factorId, replacing)} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">6-digit code</span>
        <Input name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className="w-40 tracking-[0.3em]" />
      </label>
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Checking…" : label}
      </Button>
    </form>
  );

  const isOn = state.kind === "on" || state.kind === "locked" || (state.kind === "enrolling" && state.replacing);

  return (
    <AdminFrame title="Two-factor sign-in">
      <Panel className="flex max-w-2xl flex-col gap-5">
        {state.kind === "loading" ? (
          <p className="text-fg-2">Checking…</p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-medium">
                Authenticator app <Badge tone={isOn ? "green" : "red"}>{isOn ? "On" : "Off"}</Badge>
              </p>
              <p className="mt-1 text-sm text-fg-2">
                {isOn
                  ? "Each admin sign-in asks for the 6-digit code from your phone."
                  : "Anyone with the admin password can open the admin tools."}
              </p>
            </div>
            <StatusSwitch
              on={isOn}
              disabled={busy || state.kind === "enrolling" || state.kind === "locked"}
              onClick={() => (isOn ? setConfirmOff(true) : startEnroll(false))}
            />
          </div>
        )}

        {state.kind === "on" && !confirmOff && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button onClick={() => startEnroll(true)} disabled={busy}>
              Get a new QR code
            </Button>
            <p className="w-full text-xs text-fg-2">
              Use this for a new phone. The old code keeps working until you confirm the new one.
            </p>
          </div>
        )}

        {confirmOff && (
          <div className="flex flex-col gap-3 rounded-xl bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] p-4">
            <p className="font-medium">Turn off 2FA?</p>
            <p className="text-sm">
              Your admin account will then be protected by the password only. If it leaks, someone could change cards,
              links and editor accounts.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={turnOff} disabled={busy}>
                {busy ? "Turning off…" : "Turn off 2FA"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmOff(false)}>
                Keep it on
              </Button>
            </div>
          </div>
        )}

        {state.kind === "locked" && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <p className="font-medium">Enter a code to unlock admin tools</p>
            <p className="text-sm text-fg-2">Open your authenticator app and type the code for RohTre Vault.</p>
            {codeForm(state.factorId, "Unlock", false)}
          </div>
        )}

        {state.kind === "enrolling" && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <p className="font-medium">1. Scan this code with your authenticator app</p>
            <div className="w-fit rounded-xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data from Supabase, not a remote image */}
              <img src={qrSrc(state.qr)} alt="QR code for your authenticator app" width={180} height={180} />
            </div>
            <p className="text-sm text-fg-2">
              Can’t scan? Enter this key instead: <code className="select-all break-all">{state.secret}</code>
            </p>
            <p className="font-medium">2. Type the 6-digit code it shows</p>
            {codeForm(state.factorId, state.replacing ? "Use this new code" : "Turn on 2FA", state.replacing)}
            <div>
              <Button variant="ghost" onClick={() => cancelEnroll(state.factorId)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}
      </Panel>
    </AdminFrame>
  );
}
