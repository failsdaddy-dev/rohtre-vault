import { Suspense } from "react";
import { AdminGate } from "@/components/admin/gate";
import { SecurityAdmin } from "@/components/admin/security-admin";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminGate allowAal1>
        <SecurityAdmin />
      </AdminGate>
    </Suspense>
  );
}
