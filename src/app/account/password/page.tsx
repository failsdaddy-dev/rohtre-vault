import type { Metadata } from "next";
import { Suspense } from "react";
import { requireViewer } from "@/lib/auth";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Set your password" };

async function Gate() {
  if (SUPABASE_CONFIGURED) await requireViewer({ allowPasswordChange: true });
  return <PasswordForm />;
}

export default function PasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={null}>
        <Gate />
      </Suspense>
    </main>
  );
}
