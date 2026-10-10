"use client";

// Accessible dialog: focus moves in and is trapped, Esc and backdrop close,
// focus returns to the opener. Opens with fade + slight scale (R24).

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the open/close effect.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const el = panel.current;
    const auto = el?.querySelector<HTMLElement>("[data-autofocus]");
    if (auto) auto.focus();
    else el?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      } else if (e.key === "Tab" && el) {
        const items = el.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])',
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 max-sm:p-0">
      <div className="vh-fade-in absolute inset-0 bg-[var(--overlay)]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`vh-pop-in relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-menu shadow-2xl outline-none max-sm:max-h-full max-sm:h-full max-sm:rounded-none ${
          wide ? "max-w-[960px]" : "max-w-[560px]"
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <h2 className="truncate text-base font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="vh-press grid size-10 shrink-0 place-items-center rounded-full hover:bg-hover"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
