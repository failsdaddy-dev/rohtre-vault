"use client";

// Filter groups and filters (R19): create, rename, merge, delete, reorder,
// and choose which ones appear as quick chips. Built for 700+ filters:
// groups collapse and every list is searchable.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createFilter,
  createGroup,
  deleteFilter,
  deleteGroup,
  loadTaxonomy,
  mergeFilters,
  reorder,
  slugify,
  updateFilter,
  updateGroup,
  type FilterRow,
  type GroupRow,
} from "@/lib/admin-api";
import { ChevronDown, SearchIcon } from "../icons";
import { useToast } from "../toast";
import { AdminFrame, Button, ConfirmButton, ErrorNote, Input, Panel, Select, Switch } from "./ui";

function InlineName({ value, onSave, label }: { value: string; onSave: (v: string) => Promise<void>; label: string }) {
  const [v, setV] = useState(value);
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setV(value);
  }
  return (
    <input
      value={v}
      aria-label={label}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v !== value && onSave(v.trim()).catch(() => setV(value))}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-2 font-medium outline-none hover:bg-hover focus:bg-[var(--search-bg)] focus:ring-1 focus:ring-focus"
    />
  );
}

export function FiltersAdmin() {
  const toast = useToast();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [newGroup, setNewGroup] = useState("");
  const [newFilter, setNewFilter] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState<{ from: FilterRow; into: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const t = await loadTaxonomy();
      setGroups(t.groups);
      setFilters(t.filters);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the database
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    try {
      await fn();
      if (done) toast(done);
      await load();
    } catch (e) {
      const msg = (e as Error).message;
      toast(/foreign key|violates/i.test(msg) ? "Remove or move its filters first." : /duplicate|unique/i.test(msg) ? "That name is already used." : msg);
    }
  };

  const byGroup = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map<string, FilterRow[]>();
    for (const f of filters) {
      if (needle && !f.name.toLowerCase().includes(needle)) continue;
      map.set(f.group_id, [...(map.get(f.group_id) ?? []), f]);
    }
    return map;
  }, [filters, q]);

  const moveGroup = (id: string, dir: -1 | 1) => {
    const ids = groups.map((g) => g.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => reorder("filter_groups", ids));
  };
  const moveFilter = (f: FilterRow, dir: -1 | 1) => {
    const ids = filters.filter((x) => x.group_id === f.group_id).map((x) => x.id);
    const i = ids.indexOf(f.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => reorder("filters", ids));
  };

  return (
    <AdminFrame title="Filters">
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-full border border-[var(--search-border)] bg-[var(--search-bg)] px-3 vh-field">
          <SearchIcon size={18} className="text-fg-2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${filters.length} filters`} aria-label="Search filters" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newGroup.trim();
            if (!name) return;
            setNewGroup("");
            run(() => createGroup(name, slugify(name)), "Group added");
          }}
        >
          <Input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="New group, e.g. Game" aria-label="New group name" className="w-56" />
          <Button type="submit">Add group</Button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {groups.map((g, gi) => {
          const list = byGroup.get(g.id) ?? [];
          const all = filters.filter((f) => f.group_id === g.id).length;
          const expanded = open[g.id] ?? (q.trim() !== "" || all <= 30);
          if (q.trim() && !list.length) return null;
          return (
            <Panel key={g.id}>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${g.name}`} onClick={() => setOpen((o) => ({ ...o, [g.id]: !expanded }))} className="grid size-8 place-items-center rounded-full hover:bg-hover">
                  <ChevronDown size={18} className={`transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`} />
                </button>
                <InlineName value={g.name} label="Group name" onSave={(name) => run(() => updateGroup(g.id, { name }), "Renamed")} />
                <span className="text-sm text-fg-2">{all} filters</span>
                <Button variant="ghost" aria-label="Move group up" disabled={gi === 0} onClick={() => moveGroup(g.id, -1)}>↑</Button>
                <Button variant="ghost" aria-label="Move group down" disabled={gi === groups.length - 1} onClick={() => moveGroup(g.id, 1)}>↓</Button>
                <ConfirmButton disabled={all > 0} onConfirm={() => run(() => deleteGroup(g.id), "Group deleted")} confirmLabel="Delete group?">
                  Delete
                </ConfirmButton>
              </div>

              {expanded && (
                <div className="mt-3 flex flex-col">
                  {list.map((f, fi) => (
                    <div key={f.id} className="flex flex-wrap items-center gap-2 border-t border-line py-1.5">
                      <InlineName value={f.name} label="Filter name" onSave={(name) => run(() => updateFilter(f.id, { name }))} />
                      <span className="hidden text-xs text-fg-2 md:inline">?f={f.slug}</span>
                      <Switch checked={f.is_quick} label="Chip" onChange={(v) => run(() => updateFilter(f.id, { is_quick: v }))} />
                      <Button variant="ghost" aria-label="Move up" disabled={fi === 0 || !!q.trim()} onClick={() => moveFilter(f, -1)}>↑</Button>
                      <Button variant="ghost" aria-label="Move down" disabled={fi === list.length - 1 || !!q.trim()} onClick={() => moveFilter(f, 1)}>↓</Button>
                      <Button variant="ghost" onClick={() => setMerging({ from: f, into: "" })}>Merge…</Button>
                      <ConfirmButton onConfirm={() => run(() => deleteFilter(f.id), "Filter deleted")} confirmLabel="Delete?">
                        Delete
                      </ConfirmButton>
                      {merging?.from.id === f.id && (
                        <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-chip p-2 text-sm">
                          Merge “{f.name}” into
                          <Select value={merging.into} onChange={(e) => setMerging({ from: f, into: e.target.value })} className="w-60" aria-label="Merge into">
                            <option value="">Choose a filter…</option>
                            {filters.filter((x) => x.id !== f.id).map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name} ({groups.find((gg) => gg.id === x.group_id)?.name})
                              </option>
                            ))}
                          </Select>
                          <Button
                            variant="danger"
                            disabled={!merging.into}
                            onClick={() => {
                              const into = merging.into;
                              setMerging(null);
                              run(() => mergeFilters(f.id, into), "Merged: cards and user access moved over");
                            }}
                          >
                            Merge
                          </Button>
                          <Button variant="ghost" onClick={() => setMerging(null)}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  ))}
                  <form
                    className="flex gap-2 border-t border-line pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const name = (newFilter[g.id] ?? "").trim();
                      if (!name) return;
                      setNewFilter((n) => ({ ...n, [g.id]: "" }));
                      run(() => createFilter(g.id, name, slugify(name)), "Filter added");
                    }}
                  >
                    <Input value={newFilter[g.id] ?? ""} onChange={(e) => setNewFilter((n) => ({ ...n, [g.id]: e.target.value }))} placeholder={`New filter in ${g.name}`} aria-label={`New filter in ${g.name}`} className="max-w-xs" />
                    <Button type="submit">Add</Button>
                  </form>
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </AdminFrame>
  );
}
