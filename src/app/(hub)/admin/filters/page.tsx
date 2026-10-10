import { Suspense } from "react";
import { AdminGate } from "@/components/admin/gate";
import { FiltersAdmin } from "@/components/admin/filters-admin";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminGate>
        <FiltersAdmin />
      </AdminGate>
    </Suspense>
  );
}
