"use client";

// Admin-only "Edit" on a card: a button on every card (grid, card page,
// video popup, audio player) that opens that card's admin form in a drawer
// over the page, so the admin keeps their place in a long grid.
//
// Showing the button is not the security: the drawer loads the full card
// (Mega links included) through the admin-only admin_card_links function and
// saves through the same RLS-checked writes as the admin panel
// (src/lib/admin-api.ts). The grid's list responses are unchanged.

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Card, CurrentUser } from "@/lib/types";
import { CardEditor, type SavedCard } from "./admin/card-editor";
import { Button } from "./admin/ui";
import { useHub } from "./hub-context";
import { PencilIcon } from "./icons";
import { Modal } from "./modal";
import { useToast } from "./toast";

/**
 * Where the Edit button sits on a grid card.
 * - "title-row" (default): right of the title, under the thumbnail.
 * - "thumbnail-corner": top-right corner of the thumbnail. NOTE: on video
 *   cards this puts an element in front of the preview; YouTube's Required
 *   Minimum Functionality rules forbid that over a YouTube player. The site
 *   no longer embeds YouTube (previews are Cloudinary clips), but keep the
 *   default if YouTube players ever come back.
 */
export const EDIT_BUTTON_PLACEMENT: "title-row" | "thumbnail-corner" = "title-row";

/**
 * "drawer": the admin form opens over the page (right-hand drawer on
 * desktop, full-screen sheet on phones). The form (admin/card-editor.tsx)
 * is a self-contained client component, so no "page" fallback is needed.
 */
export const EDIT_UI = "drawer" as const;

/** Returns a toast message, or nothing to let another listener (or the
 *  default "Saved") speak. */
type SavedListener = (card: SavedCard) => Promise<string | void> | string | void;

interface CardEditValue {
  edit: (card: Pick<Card, "id" | "title">, opener?: HTMLElement | null) => void;
  subscribe: (listener: SavedListener) => () => void;
}

const CardEditContext = createContext<CardEditValue | null>(null);
// The drawer itself, drawn by <CardEditHost /> inside the audio player's
// provider (the form's upload preview uses the audio player).
const DrawerContext = createContext<ReactNode>(null);

/** Only signed-in admins on the real database get Edit (sample data has no admin form). */
export function canEditCards(user: Pick<CurrentUser, "role"> | null | undefined, sampleMode: boolean): boolean {
  return !sampleMode && user?.role === "admin";
}

export function CardEditProvider({ children }: { children: ReactNode }) {
  const { user, sampleMode } = useHub();
  const allowed = canEditCards(user, sampleMode);
  const toast = useToast();
  const [target, setTarget] = useState<{ id: string; title: string; n: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const [confirming, setConfirming] = useState(false);
  const dirty = useRef(false);
  const listeners = useRef(new Set<SavedListener>());

  const edit = useCallback<CardEditValue["edit"]>((card, from) => {
    dirty.current = false;
    setConfirming(false);
    setOpener(from ?? null);
    setTarget((t) => ({ id: card.id, title: card.title, n: (t?.n ?? 0) + 1 }));
    setOpen(true);
  }, []);

  const subscribe = useCallback<CardEditValue["subscribe"]>((l) => {
    listeners.current.add(l);
    return () => {
      listeners.current.delete(l);
    };
  }, []);

  const close = useCallback(() => {
    setConfirming(false);
    setOpen(false);
  }, []);

  // Esc, Close, Cancel and a click outside all come here.
  const requestClose = useCallback(() => {
    if (!dirty.current) return close();
    // A second Esc while asking means "keep editing".
    setConfirming((c) => !c);
  }, [close]);

  useEffect(() => {
    if (confirming) document.getElementById("vh-keep-editing")?.focus();
  }, [confirming]);

  const onDirtyChange = useCallback((d: boolean) => {
    dirty.current = d;
  }, []);

  const onSaved = useCallback(
    async (card: SavedCard) => {
      close();
      let message: string | void = undefined;
      for (const l of listeners.current) {
        try {
          message = (await l(card)) || message;
        } catch {
          /* the save itself worked; a failed refresh shouldn't hide that */
        }
      }
      toast(message || "Saved");
    },
    [close, toast],
  );

  const value = useMemo<CardEditValue | null>(() => (allowed ? { edit, subscribe } : null), [allowed, edit, subscribe]);

  const drawer = allowed && target && (
    <Modal open={open} onClose={requestClose} title={`Edit: ${target.title}`} variant="drawer" returnFocus={opener}>
      {confirming && (
        <div role="alertdialog" aria-label="Unsaved changes" className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-menu px-5 py-3 text-sm">
          <p className="flex-1 font-medium">Discard your unsaved changes?</p>
          <Button id="vh-keep-editing" onClick={() => setConfirming(false)}>
            Keep editing
          </Button>
          <Button variant="danger" onClick={close}>
            Discard
          </Button>
        </div>
      )}
      <CardEditor
        key={`${target.id}:${target.n}`}
        id={target.id}
        variant="drawer"
        onSaved={onSaved}
        onCancel={requestClose}
        onDirtyChange={onDirtyChange}
      />
    </Modal>
  );

  return (
    <CardEditContext value={value}>
      <DrawerContext value={drawer || null}>{children}</DrawerContext>
    </CardEditContext>
  );
}

/** Where the edit drawer is drawn: inside AudioProvider (see app-shell). */
export function CardEditHost() {
  return <>{use(DrawerContext)}</>;
}

/** Null for everyone who isn't an admin. */
export function useCardEdit(): CardEditValue | null {
  return use(CardEditContext);
}

/** Runs after an admin saves a card from the drawer. */
export function useCardSaved(listener: SavedListener) {
  const ctx = useCardEdit();
  const latest = useRef(listener);
  useEffect(() => {
    latest.current = listener;
  }, [listener]);
  useEffect(() => ctx?.subscribe((c) => latest.current(c)), [ctx]);
}

/**
 * The Edit button. Renders nothing for non-admins. A real <button>, placed
 * next to (never inside) the card's link, so clicking it opens only the
 * drawer: no popup, no player, no navigation, no preview change.
 *
 * look "card": compact chip, icon-only on narrow cards (container query on
 * the nearest @container). look "header": same chip, always labelled.
 * look "overlay": for EDIT_BUTTON_PLACEMENT "thumbnail-corner".
 */
export function CardEditButton({
  card,
  look = "card",
  beforeEdit,
  className = "",
}: {
  card: Pick<Card, "id" | "title">;
  look?: "card" | "header" | "overlay";
  /** E.g. close the video popup first, so only one dialog is open. */
  beforeEdit?: () => void;
  className?: string;
}) {
  const ctx = useCardEdit();
  if (!ctx) return null;
  const chip =
    look === "overlay"
      ? "bg-[var(--overlay)] text-white backdrop-blur-sm hover:bg-black/70"
      : "bg-chip hover:bg-chip-hover";
  return (
    <button
      type="button"
      aria-label={`Edit ${card.title}`}
      title="Edit card"
      onClick={(e) => {
        e.stopPropagation();
        const from = e.currentTarget;
        beforeEdit?.();
        ctx.edit(card, beforeEdit ? null : from);
      }}
      // 32px chip with an invisible 40px touch target around it.
      className={`vh-press relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium after:absolute after:-inset-1 after:content-[''] ${chip} ${className}`}
    >
      <PencilIcon size={16} />
      <span className={look === "card" ? "hidden @[260px]:inline" : look === "overlay" ? "sr-only" : ""}>Edit</span>
    </button>
  );
}
