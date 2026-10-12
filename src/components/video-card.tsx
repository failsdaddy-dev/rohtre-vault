"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { HOVER_INTENT_MS, PREVIEW_AUTOPLAY, PREVIEW_STAGGER_MS, previewCoordinator, usePreviewRank } from "@/lib/preview-coordinator";
import type { Card, SectionKind } from "@/lib/types";
import { cardHref } from "@/lib/url-state";
import { clipPosterUrl } from "@/lib/cloudinary-url";
import { AudioCover } from "./audio-cover";
import { useAudio } from "./audio-player";
import { CardActions } from "./card-actions";
import { useHub } from "./hub-context";
import { LinkIcon, MoreIcon, SECTION_ICONS } from "./icons";
import { useDismiss } from "./popover";
import { ClipPreview } from "./clip-preview";
import { useToast } from "./toast";
import { VideoModal } from "./video-modal";


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
  const audio = card.mediaType === "audio";
  const rank = usePreviewRank(card.id);
  const clip = audio ? null : card.previewClip;
  const active = !!clip && rank >= 0;
  const root = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modal, setModal] = useState(false);
  const pushed = useRef(false);
  const { playCard } = useAudio();
  const href = cardHref(card);

  // Watch the card so the coordinator can give it a preview slot while it's on screen.
  useEffect(() => {
    if (!clip || !root.current) return;
    return previewCoordinator.register(card.id, root.current);
  }, [clip, card.id]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      previewCoordinator.release(card.id);
    },
    [card.id],
  );

  // Back button closes the modal it opened.
  useEffect(() => {
    if (!modal) return;
    const onPop = () => {
      pushed.current = false;
      setModal(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [modal]);

  // Hover preview only when autoplay is switched off (see preview-coordinator).
  const enter = () => {
    if (PREVIEW_AUTOPLAY || !clip) return;
    timer.current = setTimeout(() => previewCoordinator.setHovered(card.id), HOVER_INTENT_MS);
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    previewCoordinator.release(card.id);
  };

  const openModal = (e: React.MouseEvent) => {
    // New tab / window keeps working as a normal link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (!clip) {
      window.location.assign(href);
      return;
    }
    setModal(true);
    window.history.pushState({ vhModal: card.id }, "", href);
    pushed.current = true;
  };
  const closeModal = () => {
    setModal(false);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    }
  };

  return (
    <article ref={root} className="vh-offset on-hover vh-card group flex min-w-0 flex-col gap-3" onMouseEnter={enter} onMouseLeave={leave}>
      {audio ? (
        // Audio: the cover's own Play button (no link around it).
        <div className="relative aspect-video max-w-full overflow-hidden bg-[var(--skeleton)] sm:rounded-[var(--radius-thumb)]">
          <AudioCover card={card} onPlay={() => playCard(card, kind)} />
        </div>
      ) : (
        <Link
          href={href}
          aria-label={card.title}
          onClick={openModal}
          onFocus={enter}
          onBlur={leave}
          className="relative block aspect-video max-w-full overflow-hidden bg-[var(--skeleton)] sm:rounded-[var(--radius-thumb)]"
        >
          {clip ? (
            <Image
              // The clip's first frame; the loop fades in over it.
              src={clipPosterUrl(clip.url)}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <Placeholder title={card.title} kind={kind} />
          )}
          {clip && <ClipPreview url={clip.url} active={active} delayMs={Math.max(0, rank) * PREVIEW_STAGGER_MS} />}
        </Link>
      )}

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

      {clip && <VideoModal card={card} kind={kind} open={modal} onClose={closeModal} />}
    </article>
  );
});
