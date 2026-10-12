"use client";

// Decides which video cards may play their preview clip right now.
//
//   PREVIEW_AUTOPLAY on (default): the cards on screen, at most
//   PREVIEW_MAX_PLAYERS at once, nearest the middle of the viewport first.
//   Each card gets a rank so starts can be staggered (rank x PREVIEW_STAGGER_MS).
//   PREVIEW_AUTOPLAY off: only the hovered/focused card plays.
//
// The clips are short silent files on Cloudinary played by the browser's own
// <video> (not YouTube), so several can loop at once. Nothing plays while
// the full video modal or the audio player needs the screen or speakers,
// when the tab is hidden, or when the visitor prefers reduced motion.

import { useSyncExternalStore } from "react";

export const PREVIEW_AUTOPLAY = true;
export const PREVIEW_MAX_PLAYERS = 8;
export const PREVIEW_STAGGER_MS = 150;
export const HOVER_INTENT_MS = 400;

type Listener = () => void;

const elements = new Map<string, Element>();
const visible = new Set<string>();
const paused = new Set<string>();
const listeners = new Set<Listener>();
let hovered: string | null = null;
let ranks = new Map<string, number>();
let reducedMotion = false;
let hidden = false;

function emit() {
  for (const l of listeners) l();
}

function sameRanks(a: Map<string, number>, b: Map<string, number>) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

function recompute() {
  const next = new Map<string, number>();
  if (!reducedMotion && !hidden && paused.size === 0) {
    if (PREVIEW_AUTOPLAY) {
      const mid = window.innerHeight / 2;
      const order = [...visible]
        .map((id) => {
          const r = elements.get(id)?.getBoundingClientRect();
          return { id, d: r ? Math.abs(r.top + r.height / 2 - mid) : Infinity };
        })
        .sort((a, b) => a.d - b.d)
        .slice(0, PREVIEW_MAX_PLAYERS);
      order.forEach((x, i) => next.set(x.id, i));
    } else if (hovered) {
      next.set(hovered, 0);
    }
  }
  if (!sameRanks(ranks, next)) {
    ranks = next;
    emit();
  }
}

let frame = 0;
function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    recompute();
  });
}

let io: IntersectionObserver | null = null;
function observer(): IntersectionObserver {
  if (io) return io;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.previewId;
        if (!id) continue;
        if (e.isIntersecting) visible.add(id);
        else visible.delete(id);
      }
      schedule();
    },
    { threshold: 0.5 },
  );
  return io;
}

if (typeof window !== "undefined") {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion = mq.matches;
  mq.addEventListener("change", (e) => {
    reducedMotion = e.matches;
    schedule();
  });
  hidden = document.hidden;
  document.addEventListener("visibilitychange", () => {
    hidden = document.hidden;
    schedule();
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
}

export const previewCoordinator = {
  /** Watches a card; returns the cleanup. */
  register(id: string, el: HTMLElement) {
    el.dataset.previewId = id;
    elements.set(id, el);
    observer().observe(el);
    return () => {
      observer().unobserve(el);
      elements.delete(id);
      visible.delete(id);
      if (hovered === id) hovered = null;
      schedule();
    };
  },
  setHovered(id: string | null) {
    if (hovered === id) return;
    hovered = id;
    schedule();
  },
  release(id: string) {
    if (hovered === id) {
      hovered = null;
      schedule();
    }
  },
  /** Stops every preview while `reason` holds (e.g. "modal", "audio"). */
  setPaused(reason: string, on: boolean) {
    if (on) paused.add(reason);
    else paused.delete(reason);
    recompute();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  rank(id: string): number {
    return ranks.get(id) ?? -1;
  },
};

/** -1 = keep the thumbnail; 0..n = play, starting after n x PREVIEW_STAGGER_MS. */
export function usePreviewRank(id: string): number {
  return useSyncExternalStore(
    previewCoordinator.subscribe,
    () => previewCoordinator.rank(id),
    () => -1,
  );
}
