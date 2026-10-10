import { Suspense } from "react";
import { AdminGate } from "@/components/admin/gate";
import { AuditAdmin } from "@/components/admin/audit-admin";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminGate>
        <AuditAdmin />
      </AdminGate>
    </Suspense>
  );
}
