"use client";

// "More filters": every group, searchable, built to stay usable with 700+
// client/channel filters (R6, R7). Changes apply immediately to the URL.

import { useMemo, useState } from "react";
import type { Filter } from "@/lib/types";
import { useBrowseUrl } from "@/lib/use-browse-url";
import { useHub } from "./hub-context";
import { CheckIcon, SearchIcon } from "./icons";
import { Modal } from "./modal";

const COLLAPSED = 12;

export function FilterPanel({
  open,
  onClose,
  counts,
}: {
  open: boolean;
  onClose: () => void;
  counts: Record<string, number>;
}) {
  const { groups, filters } = useHub();
  const { state, toggle, clearFilters } = useBrowseUrl();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const selected = useMemo(() => new Set(state.filters), [state.filters]);

  const byGroup = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, Filter[]>();
    for (const f of filters) {
      if (q && !f.name.toLowerCase().includes(q)) continue;
      if (!map.has(f.groupId)) map.set(f.groupId, []);
      map.get(f.groupId)!.push(f);
    }
    // Selected first, then filters used in this section, then A-Z.
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          Number(selected.has(b.slug)) - Number(selected.has(a.slug)) ||
          Number((counts[b.slug] ?? 0) > 0) - Number((counts[a.slug] ?? 0) > 0) ||
          a.name.localeCompare(b.name, undefined, { numeric: true }),
      );
    }
    return map;
  }, [filters, query, selected, counts]);

  const total = [...byGroup.values()].reduce((n, l) => n + l.length, 0);

  return (
    <Modal open={open} onClose={onClose} title="More filters" wide>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-menu px-5 pb-3">
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-full border border-[var(--search-border)] bg-[var(--search-bg)] px-4 vh-field">
          <SearchIcon size={18} className="text-fg-2" />
          <input
            data-autofocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search filters (e.g. a client name)"
            aria-label="Search filters"
            className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-fg-2"
          />
        </label>
        <p className="text-sm text-fg-2">
          {state.filters.length} selected · same group = any of them, different groups = all of them
        </p>
        {state.filters.length > 0 && (
          <button type="button" onClick={clearFilters} className="rounded-full px-3 py-2 text-sm font-medium text-focus hover:bg-hover">
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 px-5 pb-6 pt-2">
        {total === 0 && <p className="py-8 text-center text-fg-2">No filters match “{query}”.</p>}
        {groups.map((g) => {
          const list = byGroup.get(g.id);
          if (!list?.length) return null;
          const showAll = expanded[g.id] || query.trim() !== "";
          const visible = showAll ? list : list.slice(0, COLLAPSED);
          return (
            <section key={g.id} aria-labelledby={`fg-${g.id}`}>
              <h3 id={`fg-${g.id}`} className="mb-2 text-sm font-medium">
                {g.name} <span className="font-normal text-fg-2">· {list.length}</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {visible.map((f) => {
                  const on = selected.has(f.slug);
                  const n = counts[f.slug] ?? 0;
                  return (
                    <button
                      key={f.slug}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(f.slug)}
                      className={`vh-press flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ${
                        on ? "bg-chip-on-bg text-chip-on-fg" : "bg-chip hover:bg-chip-hover"
                      } ${!on && n === 0 ? "opacity-60" : ""}`}
                    >
                      {on && <CheckIcon size={16} />}
                      {f.name}
                      <span className={`text-xs ${on ? "opacity-70" : "text-fg-2"}`}>{n}</span>
                    </button>
                  );
                })}
              </div>
              {!showAll && list.length > COLLAPSED && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [g.id]: true }))}
                  className="mt-2 rounded-full px-3 py-1.5 text-sm font-medium text-focus hover:bg-hover"
                >
                  Show all {list.length}
                </button>
              )}
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
