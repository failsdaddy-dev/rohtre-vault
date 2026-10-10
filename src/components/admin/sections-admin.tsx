"use client";

import { useCallback, useEffect, useState } from "react";
import { createSection, deleteSection, loadTaxonomy, reorder, slugify, updateSection, type SectionRow } from "@/lib/admin-api";
import type { SectionKind } from "@/lib/types";
import { useToast } from "../toast";
import { AdminFrame, Button, ConfirmButton, ErrorNote, Input, Panel, Select, Switch, TABLE } from "./ui";

const KINDS: { value: SectionKind; label: string }[] = [
  { value: "effect", label: "Effects (Project files + Download video)" },
  { value: "music", label: "Music (Open on platform + Download audio)" },
  { value: "sound", label: "Sound effects" },
  { value: "font", label: "Fonts" },
  { value: "text", label: "Text & graphics" },
];

export function SectionsAdmin() {
  const toast = useToast();
  const [rows, setRows] = useState<SectionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SectionKind>("effect");

  const load = useCallback(async () => {
    try {
      setRows((await loadTaxonomy()).sections);
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
      toast(/foreign key|violates/i.test(msg) ? "This section still has cards. Move or delete them first." : /duplicate|unique/i.test(msg) ? "That name is already used." : msg);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const ids = rows.map((r) => r.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => reorder("sections", ids));
  };

  return (
    <AdminFrame title="Sections">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Panel className="mb-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const n = name.trim();
            setName("");
            run(() => createSection({ name: n, slug: slugify(n), kind }), "Section added");
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">New section</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Transitions" className="w-60" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Type (sets the card buttons)</span>
            <Select value={kind} onChange={(e) => setKind(e.target.value as SectionKind)} className="w-80">
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit" variant="primary">Add section</Button>
        </form>
      </Panel>
      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Name</th>
              <th>Link</th>
              <th>Type</th>
              <th>Shown in menu</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>
                  <Button variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
                  <Button variant="ghost" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</Button>
                </td>
                <td>
                  <Input defaultValue={r.name} aria-label="Section name" className="w-56" onBlur={(e) => e.target.value.trim() && e.target.value !== r.name && run(() => updateSection(r.id, { name: e.target.value.trim() }), "Renamed")} />
                </td>
                <td className="text-fg-2">/{r.slug}</td>
                <td>{KINDS.find((k) => k.value === r.kind)?.label.split(" (")[0]}</td>
                <td>
                  <Switch checked={r.is_visible} label={r.is_visible ? "Shown" : "Hidden"} onChange={(v) => run(() => updateSection(r.id, { is_visible: v }))} />
                </td>
                <td className="text-right">
                  <ConfirmButton onConfirm={() => run(() => deleteSection(r.id), "Section deleted")} confirmLabel="Delete?">
                    Delete
                  </ConfirmButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminFrame>
  );
}
