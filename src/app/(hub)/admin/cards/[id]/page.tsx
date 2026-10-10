import { Suspense } from "react";
import { AdminGate } from "@/components/admin/gate";
import { CardEditor } from "@/components/admin/card-editor";

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CardEditor id={id} />;
}

export default function Page({ params }: PageProps<"/admin/cards/[id]">) {
  return (
    <Suspense fallback={null}>
      <AdminGate>
        <Editor params={params} />
      </AdminGate>
    </Suspense>
  );
}
