"use client";

// Shareable card page, e.g. /effects/tv-documentary-football-screen (R3).

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getDataSource } from "@/lib/data-source";
import type { Card, Section } from "@/lib/types";
import { buildHref } from "@/lib/url-state";
import { thumbnailUrl } from "@/lib/youtube";
import { CardActions } from "./card-actions";
import { useHub } from "./hub-context";
import { CheckIcon, LinkIcon, SECTION_ICONS } from "./icons";
import { PreviewPlayer } from "./preview-player";
import { MessageState, PillLink } from "./states";
import { cardHref } from "./video-card";

type State = { status: "loading" } | { status: "missing" } | { status: "ready"; card: Card };

function CopyLinkButton({ card }: { card: Card }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? cardHref(card) : `${window.location.origin}${cardHref(card)}`;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            (document.getElementById("vh-share-url") as HTMLInputElement | null)?.select();
          }
        }}
        className="vh-press flex h-10 items-center justify-center gap-2 rounded-full bg-chip px-4 text-sm font-medium hover:bg-chip-hover"
      >
        {copied ? <CheckIcon size={18} /> : <LinkIcon size={18} />}
        {copied ? "Link copied" : "Copy link"}
      </button>
      <input
        id="vh-share-url"
        readOnly
        value={url}
        aria-label="Link to this card"
        onFocus={(e) => e.currentTarget.select()}
        className="h-9 w-full rounded-lg border border-line bg-transparent px-3 text-xs text-fg-2 outline-none vh-field"
      />
    </div>
  );
}

export function CardPageView({ section, slug }: { section: Section; slug: string }) {
  const { filterBySlug, groups } = useHub();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let live = true;
    getDataSource()
      .card(section.slug, slug)
      .then((card) => live && setState(card ? { status: "ready", card } : { status: "missing" }))
      .catch(() => live && setState({ status: "missing" }));
    return () => {
      live = false;
    };
  }, [section.slug, slug]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto grid max-w-[1400px] gap-6 px-6 py-6 max-sm:px-0 lg:grid-cols-[1fr_380px]" aria-label="Loading" role="status">
        <div className="vh-skeleton aspect-video sm:rounded-[var(--radius-thumb)]" />
        <div className="flex flex-col gap-3 max-sm:px-3">
          <div className="vh-skeleton h-7 w-3/4 rounded" />
          <div className="vh-skeleton h-4 w-1/2 rounded" />
          <div className="vh-skeleton h-10 rounded-full" />
        </div>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <MessageState
        title="This card isn’t available"
        body="It may have been removed, or it’s outside the filters your account can see."
        action={<PillLink href={`/${section.slug}`}>Back to {section.name}</PillLink>}
      />
    );
  }

  const { card } = state;
  const Icon = SECTION_ICONS[section.kind];
  const filters = card.filterSlugs.map((s) => filterBySlug.get(s)).filter((f) => f !== undefined);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-6 py-6 max-sm:px-0 max-sm:pt-0 lg:grid-cols-[minmax(0,1fr)_380px]">
      <title>{`${card.title} · RohTre Vault`}</title>
      <div className="relative aspect-video max-w-full overflow-hidden bg-black sm:rounded-[var(--radius-thumb)]">
        {card.youtubeId ? (
          <>
            <Image src={thumbnailUrl(card.youtubeId)} alt="" fill sizes="(max-width: 1024px) 100vw, 1000px" className="object-cover" priority />
            <PreviewPlayer youtubeId={card.youtubeId} start={card.previewStart} end={card.previewEnd} active title={card.title} />
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-fg-2">
            <div className="flex flex-col items-center gap-2">
              <Icon size={40} />
              <span>No preview added yet</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-5 max-sm:px-3">
        <div>
          <Link href={`/${section.slug}`} className="inline-flex items-center gap-1.5 text-sm text-fg-2 hover:text-fg">
            <Icon size={16} /> {section.name}
          </Link>
          <h1 className="mt-1 text-xl font-bold leading-7 [text-wrap:balance]">{card.title}</h1>
        </div>

        <CardActions card={card} kind={section.kind} size="page" />

        {filters.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-medium">Filters</h2>
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <Link
                  key={f.slug}
                  href={buildHref(section.slug, { filters: [f.slug] })}
                  title={`All ${section.name.toLowerCase()} with ${f.name}`}
                  className="vh-press flex h-8 items-center gap-1 rounded-lg bg-chip px-3 text-sm font-medium hover:bg-chip-hover"
                >
                  {f.name}
                  <span className="text-xs font-normal text-fg-2">· {groups.find((g) => g.id === f.groupId)?.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {card.description && (
          <div className="rounded-xl bg-chip p-3 text-sm leading-5">
            <p className="mb-1 font-medium">How to use</p>
            <p className="whitespace-pre-line">{card.description}</p>
          </div>
        )}

        <div>
          <h2 className="mb-2 text-sm font-medium">Share with an editor</h2>
          <CopyLinkButton card={card} />
        </div>
      </div>
    </div>
  );
}
