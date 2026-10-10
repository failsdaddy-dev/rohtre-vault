import { Suspense } from "react";
import { AdminGate } from "@/components/admin/gate";
import { AdminOverview } from "@/components/admin/overview";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminGate>
        <AdminOverview />
      </AdminGate>
    </Suspense>
  );
}
