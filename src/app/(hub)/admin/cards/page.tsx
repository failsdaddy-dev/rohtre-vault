import { Suspense } from "react";
import { AdminGate } from "@/components/admin/gate";
import { CardsAdmin } from "@/components/admin/cards-admin";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminGate>
        <CardsAdmin />
      </AdminGate>
    </Suspense>
  );
}
