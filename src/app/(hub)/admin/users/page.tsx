import { Suspense } from "react";
import { AdminGate } from "@/components/admin/gate";
import { UsersAdmin } from "@/components/admin/users-admin";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminGate>
        <UsersAdmin />
      </AdminGate>
    </Suspense>
  );
}
