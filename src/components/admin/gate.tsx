import "server-only";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { AdminFrame, SampleModeNote } from "./ui";

/** Server-side admin check for every admin page (the database enforces it again). */
export async function AdminGate({ children, allowAal1 }: { children: ReactNode; allowAal1?: boolean }) {
  if (!SUPABASE_CONFIGURED) {
    return (
      <AdminFrame title="Admin">
        <SampleModeNote />
      </AdminFrame>
    );
  }
  await requireAdmin({ allowAal1 });
  return <>{children}</>;
}
