import { Suspense } from "react";
import { AdminGate } from "@/components/admin/gate";
import { SectionsAdmin } from "@/components/admin/sections-admin";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminGate>
        <SectionsAdmin />
      </AdminGate>
    </Suspense>
  );
}
