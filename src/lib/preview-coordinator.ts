"use client";

// Decides which cards may run a YouTube player right now.
//   hover mode (default): exactly one card, the one being hovered/tapped.
//   autoplay mode: the visible cards, up to MAX_AUTOPLAY at once.

import { useSyncExternalStore } from "react";

export const MAX_AUTOPLAY = 4;

type Listener = () => void;

let hovered: string | null = null;
let visible: string[] = []; // in order of appearance
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export const previewCoordinator = {
  setHovered(id: string | null) {
    if (hovered === id) return;
    hovered = id;
    emit();
  },
  release(id: string) {
    if (hovered === id) {
      hovered = null;
      emit();
    }
  },
  setVisible(id: string, isVisible: boolean) {
    const has = visible.includes(id);
    if (isVisible && !has) visible = [...visible, id];
    else if (!isVisible && has) visible = visible.filter((v) => v !== id);
    else return;
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  isActive(id: string, autoplay: boolean): boolean {
    if (hovered === id) return true;
    if (!autoplay) return false;
    // The hovered card takes one of the slots.
    const slots = hovered ? MAX_AUTOPLAY - 1 : MAX_AUTOPLAY;
    return visible.filter((v) => v !== hovered).slice(0, slots).includes(id);
  },
};

export function usePreviewActive(id: string, autoplay: boolean): boolean {
  return useSyncExternalStore(
    previewCoordinator.subscribe,
    () => previewCoordinator.isActive(id, autoplay),
    () => false,
  );
}
