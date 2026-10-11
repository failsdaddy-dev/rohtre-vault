import type { Metadata } from "next";
import { AuthCard, AuthShell } from "@/components/auth-shell";
import { LockIcon, LogoutIcon } from "@/components/icons";

export const metadata: Metadata = { title: "No access" };

export default function NoAccess() {
  return (
    <AuthShell>
      <AuthCard>
        <span className="grid size-12 place-items-center rounded-2xl bg-brand/12 text-brand">
          <LockIcon size={22} />
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em]">No access</h1>
        <p className="mt-2 text-fg-2">
          Your account has been disabled or has expired. If you think this is a mistake, ask the admin to check your
          account.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="vh-press inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-chip-on-bg font-semibold text-chip-on-fg hover:opacity-90"
          >
            <LogoutIcon size={18} /> Sign out
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
