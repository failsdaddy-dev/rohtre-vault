import { Suspense } from "react";
import { AdminGate } from "@/components/admin/gate";
import { CardEditor } from "@/components/admin/card-editor";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminGate>
        <CardEditor />
      </AdminGate>
    </Suspense>
  );
}
