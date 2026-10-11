"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { previewCoordinator, usePreviewActive } from "@/lib/preview-coordinator";
import { useSettings } from "@/lib/settings";
import type { Card, SectionKind } from "@/lib/types";
import { thumbnailUrl } from "@/lib/youtube";
import { CardActions } from "./card-actions";
import { useHub } from "./hub-context";
import { LinkIcon, MoreIcon, SECTION_ICONS } from "./icons";
import { useDismiss } from "./popover";
import { PreviewPlayer } from "./preview-player";
import { useToast } from "./toast";

export const HOVER_INTENT_MS = 400;

/** Shown when a card has no YouTube preview yet. */
function Placeholder({ title, kind }: { title: string; kind: SectionKind }) {
  const Icon = SECTION_ICONS[kind];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,var(--ph-a),var(--ph-b))] p-4 text-center">
      <Icon size={30} className="text-brand" />
      <span className="line-clamp-2 max-w-[85%] text-sm font-medium text-fg-2">{title}</span>
    </div>
  );
}

export function previewLength(card: Card) {
  if (!card.youtubeId) return null;
  const len = (card.previewEnd ?? card.previewStart + 6) - card.previewStart;
  return `0:${String(Math.max(1, len)).padStart(2, "0")}`;
}

export function cardHref(card: Card) {
  return `/${card.sectionSlug}/${card.slug}`;
}

function FilterTags({ slugs }: { slugs: string[] }) {
  const { filterBySlug } = useHub();
  const names = slugs.map((s) => filterBySlug.get(s)?.name).filter((n): n is string => !!n);
  if (!names.length) return null;
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  return (
    <div className="group/tags relative mt-1 flex flex-wrap items-center gap-1.5 text-xs text-fg-2">
      {shown.map((n) => (
        <span key={n} className="rounded-md bg-chip px-1.5 py-0.5">
          {n}
        </span>
      ))}
      {rest > 0 && (
        <span tabIndex={0} className="cursor-default rounded-md bg-chip px-1.5 py-0.5" aria-label={`All filters: ${names.join(", ")}`}>
          +{rest}
        </span>
      )}
      {rest > 0 && (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-max max-w-[260px] rounded-lg bg-menu p-2 text-fg shadow-xl ring-1 ring-line group-focus-within/tags:block group-hover/tags:block"
        >
          {names.join(" · ")}
        </div>
      )}
    </div>
  );
}

function CardMenu({ card }: { card: Card }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, box, close);

  const copy = async () => {
    const url = `${window.location.origin}${cardHref(card)}`;
    setOpen(false);
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast(url);
    }
  };

  return (
    <div ref={box} className="relative -mr-2 shrink-0">
      <button
        type="button"
        aria-label={`More actions for ${card.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-9 place-items-center rounded-full opacity-0 hover:bg-hover focus-visible:opacity-100 group-hover:opacity-100 aria-expanded:opacity-100 max-sm:opacity-100"
      >
        <MoreIcon size={20} />
      </button>
      {open && (
        <div role="menu" className="vh-pop-in absolute right-0 top-10 z-30 w-48 origin-top-right vh-menu">
          <button type="button" role="menuitem" onClick={copy} className="vh-menu-item flex w-full items-center gap-3 text-sm">
            <LinkIcon size={18} /> Copy link
          </button>
        </div>
      )}
    </div>
  );
}

export const VideoCard = memo(function VideoCard({ card, kind }: { card: Card; kind: SectionKind }) {
  const { autoplay } = useSettings();
  const active = usePreviewActive(card.id, autoplay) && !!card.youtubeId;
  const root = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touched = useRef(false);
  const href = cardHref(card);

  // Autoplay mode: report visibility so the coordinator can cap players.
  useEffect(() => {
    if (!autoplay || !card.youtubeId || !root.current) return;
    const el = root.current;
    const io = new IntersectionObserver(([e]) => previewCoordinator.setVisible(card.id, e.isIntersecting), {
      threshold: 0.6,
    });
    io.observe(el);
    return () => {
      io.disconnect();
      previewCoordinator.setVisible(card.id, false);
    };
  }, [autoplay, card.id, card.youtubeId]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      previewCoordinator.release(card.id);
    },
    [card.id],
  );

  const enter = () => {
    if (touched.current || !card.youtubeId) return;
    timer.current = setTimeout(() => previewCoordinator.setHovered(card.id), HOVER_INTENT_MS);
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    if (!touched.current) previewCoordinator.release(card.id);
  };

  return (
    <article ref={root} className="vh-offset on-hover vh-card group flex min-w-0 flex-col gap-3" onMouseEnter={enter} onMouseLeave={leave}>
      <Link
        href={href}
        aria-label={card.title}
        onPointerDown={(e) => {
          touched.current = e.pointerType === "touch";
        }}
        onFocus={enter}
        onBlur={leave}
        onClick={(e) => {
          // Touch: first tap plays the preview, second tap opens the card.
          if (touched.current && card.youtubeId && !active) {
            e.preventDefault();
            previewCoordinator.setHovered(card.id);
          }
        }}
        className="relative block aspect-video max-w-full overflow-hidden bg-[var(--skeleton)] sm:rounded-[var(--radius-thumb)]"
      >
        {card.youtubeId ? (
          <Image
            src={thumbnailUrl(card.youtubeId)}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <Placeholder title={card.title} kind={kind} />
        )}
        {card.youtubeId && (
          <PreviewPlayer
            youtubeId={card.youtubeId}
            start={card.previewStart}
            end={card.previewEnd}
            active={active}
            title={card.title}
          />
        )}
        {previewLength(card) && (
          <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1 text-xs font-medium text-white">
            {previewLength(card)}
          </span>
        )}
      </Link>

      <div className="flex gap-2 max-sm:px-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-medium leading-[22px]">
            <Link href={href} className="hover:underline-offset-2">
              {card.title}
            </Link>
          </h3>
          <FilterTags slugs={card.filterSlugs} />
        </div>
        <CardMenu card={card} />
      </div>

      <div className="max-sm:px-3">
        <CardActions card={card} kind={kind} />
      </div>
    </article>
  );
});
