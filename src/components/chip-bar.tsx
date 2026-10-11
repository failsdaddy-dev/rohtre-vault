"use client";

// Sticky, horizontally scrolling chip row under the header (R7).
// Shows: All · selected filters · quick filters used in this section · More filters.

import { useEffect, useRef, useState } from "react";
import { useBrowseUrl } from "@/lib/use-browse-url";
import { FilterPanel } from "./filter-panel";
import { useHub } from "./hub-context";
import { ChevronLeft, ChevronRight, TuneIcon } from "./icons";

function Chip({
  on,
  onClick,
  children,
  label,
}: {
  on?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={`vh-press flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium ${
        on ? "bg-chip-on-bg text-chip-on-fg" : "bg-chip hover:bg-chip-hover"
      }`}
    >
      {children}
    </button>
  );
}

export function ChipBar({ counts }: { counts: Record<string, number> }) {
  const { filters, filterBySlug } = useHub();
  const { state, toggle, clearFilters } = useBrowseUrl();
  const [panel, setPanel] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const selected = state.filters.map((s) => filterBySlug.get(s)).filter((f) => f !== undefined);
  const quick = filters.filter((f) => f.isQuick && !state.filters.includes(f.slug) && (counts[f.slug] ?? 0) > 0);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const update = () =>
      setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [state.filters.length, quick.length]);

  const scrollBy = (dir: 1 | -1) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.current?.scrollBy({ left: dir * 320, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="sticky top-14 z-20 bg-bg">
      <div className="relative">
        <div ref={row} className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 py-3" role="toolbar" aria-label="Filters">
          <Chip on={state.filters.length === 0} onClick={clearFilters}>
            All
          </Chip>
          {selected.map((f) => (
            <Chip key={f.slug} on onClick={() => toggle(f.slug)} label={`${f.name}, selected. Click to remove`}>
              {f.name}
            </Chip>
          ))}
          {quick.map((f) => (
            <Chip key={f.slug} onClick={() => toggle(f.slug)}>
              {f.name}
            </Chip>
          ))}
          <Chip onClick={() => setPanel(true)}>
            <TuneIcon size={18} />
            More filters
          </Chip>
        </div>

        {/* Edge arrows with fade, like the reference */}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 flex items-center bg-gradient-to-r from-bg from-60% to-transparent pr-8 transition-opacity duration-[var(--dur-2)] ${
            edges.left ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => scrollBy(-1)}
            className={`grid size-10 place-items-center rounded-full hover:bg-hover ${edges.left ? "pointer-events-auto" : ""}`}
          >
            <ChevronLeft />
          </button>
        </div>
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-bg from-60% to-transparent pl-8 transition-opacity duration-[var(--dur-2)] ${
            edges.right ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => scrollBy(1)}
            className={`grid size-10 place-items-center rounded-full hover:bg-hover ${edges.right ? "pointer-events-auto" : ""}`}
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <FilterPanel open={panel} onClose={() => setPanel(false)} counts={counts} />
    </div>
  );
}
