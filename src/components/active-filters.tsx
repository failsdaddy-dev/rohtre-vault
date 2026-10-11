"use client";

// The small "Active filters" tab in the left guide (R9). Hover or focus shows
// every applied filter; each one is removed with a single click.

import { useCallback, useRef, useState } from "react";
import { useBrowseUrl } from "@/lib/use-browse-url";
import { useHub } from "./hub-context";
import { CloseIcon, TuneIcon } from "./icons";

export function ActiveFilterList({ onEmpty }: { onEmpty?: () => void }) {
  const { filterBySlug, groups } = useHub();
  const { state, remove, clearFilters } = useBrowseUrl();
  const active = state.filters.map((s) => filterBySlug.get(s)).filter((f) => f !== undefined);
  const unknown = state.filters.filter((s) => !filterBySlug.has(s));

  if (!state.filters.length) {
    return <p className="px-3 py-2 text-sm text-fg-2">No filters applied.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {active.map((f) => (
        <button
          key={f.slug}
          type="button"
          onClick={() => {
            remove(f.slug);
            if (state.filters.length === 1) onEmpty?.();
          }}
          aria-label={`Remove filter ${f.name}`}
          className="vh-press group flex items-center justify-between gap-3 rounded-lg bg-chip px-3 py-1.5 text-left text-sm hover:bg-chip-hover"
        >
          <span className="min-w-0">
            <span className="block truncate font-medium">{f.name}</span>
            <span className="block truncate text-xs text-fg-2">{groups.find((g) => g.id === f.groupId)?.name}</span>
          </span>
          <CloseIcon size={16} className="shrink-0 opacity-70 group-hover:opacity-100" />
        </button>
      ))}
      {unknown.map((slug) => (
        <button
          key={slug}
          type="button"
          onClick={() => remove(slug)}
          aria-label={`Remove unknown filter ${slug}`}
          className="flex items-center justify-between gap-3 rounded-lg bg-chip px-3 py-1.5 text-left text-sm text-fg-2 hover:bg-chip-hover"
        >
          <span className="truncate">{slug} (not available)</span>
          <CloseIcon size={16} />
        </button>
      ))}
      {state.filters.length > 1 && (
        <button
          type="button"
          onClick={() => {
            clearFilters();
            onEmpty?.();
          }}
          className="mt-1 rounded-lg px-3 py-1.5 text-left text-sm font-medium text-focus hover:bg-hover"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/** Guide entry. `mini` renders the 72px icon version. */
export function ActiveFiltersTab({ mini }: { mini: boolean }) {
  const { state } = useBrowseUrl();
  const [open, setOpen] = useState(false);
  // The guide scrolls, so the panel is fixed-positioned next to the tab
  // instead of being clipped by the guide's overflow.
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = state.filters.length;

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ top: Math.min(r.top, window.innerHeight - 320), left: r.right + 8 });
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 180);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) hide();
      }}
    >
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-label={`Active filters: ${count}`}
        onClick={() => (open ? setOpen(false) : show())}
        className={
          mini
            ? "vh-nav flex w-full flex-col items-center gap-1.5 rounded-[10px] py-4 text-[10px] hover:bg-hover"
            : "vh-nav flex h-10 w-full items-center gap-6 rounded-[10px] px-3 text-sm hover:bg-hover"
        }
      >
        <span className="relative">
          <TuneIcon />
          {count > 0 && (
            <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-medium text-brand-fg">
              {count}
            </span>
          )}
        </span>
        <span className={mini ? "" : "flex-1 text-left"}>{mini ? "Filters" : "Active filters"}</span>
      </button>

      {open && (
        <div
          role="region"
          aria-label="Active filters"
          style={{ top: pos.top, left: pos.left }}
          className="vh-pop-in fixed z-50 max-h-[300px] w-64 origin-left overflow-y-auto vh-menu"
        >
          <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-fg-2">
            Applied filters
          </p>
          <ActiveFilterList />
        </div>
      )}
    </div>
  );
}
