import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardPageView } from "@/components/card-page-view";
import { findSection } from "@/lib/hub-data";

async function CardPage({ params }: { params: Promise<{ section: string; slug: string }> }) {
  const { section, slug } = await params;
  const s = await findSection(section);
  if (!s) notFound();
  return <CardPageView section={s} slug={slug} />;
}

export default function Page({ params }: PageProps<"/[section]/[slug]">) {
  return (
    <Suspense fallback={null}>
      <CardPage params={params} />
    </Suspense>
  );
}
