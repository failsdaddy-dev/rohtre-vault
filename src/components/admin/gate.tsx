import "server-only";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { AdminFrame, SampleModeNote } from "./ui";

/** Server-side admin check for every admin page (the database enforces it again). */
export async function AdminGate({ children }: { children: ReactNode }) {
  if (!SUPABASE_CONFIGURED) {
    return (
      <AdminFrame title="Admin">
        <SampleModeNote />
      </AdminFrame>
    );
  }
  await requireAdmin();
  return <>{children}</>;
}
