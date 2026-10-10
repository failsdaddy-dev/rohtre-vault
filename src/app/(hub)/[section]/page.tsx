import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BrowseView } from "@/components/browse-view";
import { GridSkeleton } from "@/components/states";
import { SECTIONS } from "@/lib/mock-data";

async function SectionBrowse({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const s = SECTIONS.find((x) => x.slug === section);
  if (!s) notFound();
  return (
    <>
      <title>{`${s.name} · RohTre Vault`}</title>
      <BrowseView section={s} />
    </>
  );
}

export default function SectionPage({ params }: PageProps<"/[section]">) {
  return (
    <Suspense
      fallback={
        <div className="px-6 pt-16 max-sm:px-0">
          <GridSkeleton />
        </div>
      }
    >
      <SectionBrowse params={params} />
    </Suspense>
  );
}
