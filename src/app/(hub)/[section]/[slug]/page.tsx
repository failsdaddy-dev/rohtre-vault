import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardPageView } from "@/components/card-page-view";
import { SECTIONS } from "@/lib/mock-data";

async function CardPage({ params }: { params: Promise<{ section: string; slug: string }> }) {
  const { section, slug } = await params;
  const s = SECTIONS.find((x) => x.slug === section);
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
