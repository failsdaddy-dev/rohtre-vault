"use client";

// Fast tagging (R20): search, tick 3-4 filters, done. Used in the card editor,
// the right-click menu on the cards list, and user access.

import { useMemo, useState } from "react";
import type { FilterRow, GroupRow } from "@/lib/admin-api";
import { CheckIcon, SearchIcon } from "../icons";

export function FilterPicker({
  groups,
  filters,
  selected,
  onToggle,
  maxHeight = 320,
  autoFocus,
}: {
  groups: GroupRow[];
  filters: FilterRow[];
  selected: ReadonlySet<string>;
  onToggle: (filterId: string) => void;
  maxHeight?: number;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const byGroup = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map<string, FilterRow[]>();
    for (const f of filters) {
      if (needle && !f.name.toLowerCase().includes(needle)) continue;
      map.set(f.group_id, [...(map.get(f.group_id) ?? []), f]);
    }
    return map;
  }, [filters, q]);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex h-9 items-center gap-2 rounded-full border border-[var(--search-border)] bg-[var(--search-bg)] px-3 vh-field">
        <SearchIcon size={16} className="text-fg-2" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search filters"
          aria-label="Search filters"
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-2"
        />
      </label>
      <div className="flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight }}>
        {groups.map((g) => {
          const list = byGroup.get(g.id);
          if (!list?.length) return null;
          return (
            <div key={g.id}>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-2">{g.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {list.map((f) => {
                  const on = selected.has(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onToggle(f.id)}
                      className={`vh-press flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium ${
                        on ? "bg-chip-on-bg text-chip-on-fg" : "bg-chip hover:bg-chip-hover"
                      }`}
                    >
                      {on && <CheckIcon size={14} />}
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {byGroup.size === 0 && <p className="py-4 text-center text-sm text-fg-2">No filters match.</p>}
      </div>
    </div>
  );
}

/** "Cartoon, FC 27 +2" with every name on hover (R20). */
export function FilterSummary({ ids, filters }: { ids: string[]; filters: FilterRow[] }) {
  const names = ids.map((id) => filters.find((f) => f.id === id)?.name).filter((n): n is string => !!n);
  if (!names.length) return <span className="text-fg-2">None</span>;
  const shown = names.slice(0, 2).join(", ");
  return (
    <span className="group/fs relative cursor-default" tabIndex={0}>
      {shown}
      {names.length > 2 && <span className="text-fg-2"> +{names.length - 2}</span>}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-max max-w-[280px] rounded-lg bg-menu p-2 text-xs shadow-xl ring-1 ring-line group-focus/fs:block group-hover/fs:block"
      >
        {names.join(" · ")}
      </span>
    </span>
  );
}
