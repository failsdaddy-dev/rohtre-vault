"use client";

// Sections: add, edit (name, link, type), reorder, show/hide, delete.

import { useRouter } from "next/navigation";
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

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface Draft {
  id: string;
  name: string;
  slug: string;
  kind: SectionKind;
}

export function SectionsAdmin() {
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<Draft | null>(null);
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
      // The side menu is loaded with the page; refresh it too.
      router.refresh();
      return true;
    } catch (e) {
      const msg = (e as Error).message;
      toast(/foreign key|violates/i.test(msg) ? "This section still has cards. Move or delete them first." : /duplicate|unique/i.test(msg) ? "That link is already used by another section." : msg);
      return false;
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const row = rows.find((r) => r.id === editing.id);
    const name = editing.name.trim();
    const slug = slugify(editing.slug);
    if (!name) return toast("Add a name.");
    if (!SLUG.test(slug)) return toast("The link may only use lowercase letters, numbers and dashes.");
    const patch: Partial<SectionRow> = {};
    if (name !== row?.name) patch.name = name;
    if (slug !== row?.slug) patch.slug = slug;
    if (editing.kind !== row?.kind) patch.kind = editing.kind;
    if (!Object.keys(patch).length) return setEditing(null);
    if (await run(() => updateSection(editing.id, patch), "Section saved")) setEditing(null);
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
            {rows.map((r, i) => {
              const e = editing?.id === r.id ? editing : null;
              return (
                <tr key={r.id}>
                  <td>
                    <Button variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
                    <Button variant="ghost" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</Button>
                  </td>
                  <td>
                    {e ? (
                      <Input
                        autoFocus
                        value={e.name}
                        maxLength={60}
                        aria-label="Section name"
                        className="w-56"
                        onChange={(ev) => setEditing({ ...e, name: ev.target.value })}
                        onKeyDown={(ev) => ev.key === "Enter" && saveEdit()}
                      />
                    ) : (
                      <span className="font-medium">{r.name}</span>
                    )}
                  </td>
                  <td className="text-fg-2">
                    {e ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          /
                          <Input
                            value={e.slug}
                            aria-label="Section link"
                            className="w-44"
                            onChange={(ev) => setEditing({ ...e, slug: ev.target.value.toLowerCase().replace(/\s+/g, "-") })}
                            onKeyDown={(ev) => ev.key === "Enter" && saveEdit()}
                          />
                        </div>
                        {slugify(e.slug) !== r.slug && <span className="text-xs">Old links to this section and its cards will stop working.</span>}
                      </div>
                    ) : (
                      `/${r.slug}`
                    )}
                  </td>
                  <td>
                    {e ? (
                      <Select value={e.kind} aria-label="Section type" className="w-64" onChange={(ev) => setEditing({ ...e, kind: ev.target.value as SectionKind })}>
                        {KINDS.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      KINDS.find((k) => k.value === r.kind)?.label.split(" (")[0]
                    )}
                  </td>
                  <td>
                    <Switch checked={r.is_visible} label={r.is_visible ? "Shown" : "Hidden"} onChange={(v) => run(() => updateSection(r.id, { is_visible: v }))} />
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      {e ? (
                        <>
                          <Button variant="primary" onClick={saveEdit}>
                            Save
                          </Button>
                          <Button onClick={() => setEditing(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => setEditing({ id: r.id, name: r.name, slug: r.slug, kind: r.kind })}>Edit</Button>
                          <ConfirmButton onConfirm={() => run(() => deleteSection(r.id), "Section deleted")} confirmLabel="Delete?">
                            Delete
                          </ConfirmButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminFrame>
  );
}
