import Link from "next/link";
import { AuthCard, AuthShell } from "@/components/auth-shell";
import { ArrowRightIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <AuthShell>
      <AuthCard>
        <p className="text-6xl font-bold leading-none tracking-[-0.05em] text-brand">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em]">Page not found</h1>
        <p className="mt-2 text-fg-2">This page isn’t available. Check the link, or go back to the library.</p>
        <Link
          href="/effects"
          className="vh-press mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-chip-on-bg font-semibold text-chip-on-fg hover:opacity-90"
        >
          Go to Effects <ArrowRightIcon size={18} strokeWidth={2.2} />
        </Link>
      </AuthCard>
    </AuthShell>
  );
}
