"use client";

// Cards list: search, section/status filters, manual order, publish toggle,
// link-open counts, and right-click to tag filters in place (Phase 0, Q15).

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteCard,
  linkOpenCounts,
  listCards,
  loadTaxonomy,
  reorder,
  setCardFilters,
  setCardStatus,
  type CardWithFilters,
  type FilterRow,
  type GroupRow,
  type SectionRow,
} from "@/lib/admin-api";
import { clipPosterUrl, parsePreviewClip } from "@/lib/cloudinary-url";
import { ChevronDown, ChevronLeft, SearchIcon } from "../icons";
import { useDismiss } from "../popover";
import { useToast } from "../toast";
import { FilterPicker, FilterSummary } from "./filter-picker";
import { AdminFrame, Badge, ButtonLink, ConfirmButton, ErrorNote, Select, TABLE } from "./ui";

interface Taxonomy {
  sections: SectionRow[];
  groups: GroupRow[];
  filters: FilterRow[];
}

function TagMenu({
  card,
  tax,
  at,
  onClose,
  onSaved,
}: {
  card: CardWithFilters;
  tax: Taxonomy;
  at: { x: number; y: number };
  onClose: () => void;
  onSaved: (ids: string[]) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const [ids, setIds] = useState(() => new Set(card.filter_ids));
  useDismiss(true, box, onClose);

  const toggle = async (id: string) => {
    const next = new Set(ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setIds(next);
    try {
      await setCardFilters(card.id, [...next]);
      onSaved([...next]);
    } catch (e) {
      toast(`Couldn’t save filters: ${(e as Error).message}`);
    }
  };

  const left = Math.min(at.x, window.innerWidth - 340);
  const top = Math.min(at.y, window.innerHeight - 440);
  return (
    <div
      ref={box}
      role="dialog"
      aria-label={`Filters for ${card.title}`}
      style={{ left, top }}
      className="vh-pop-in fixed z-50 w-[320px] vh-menu !p-3"
    >
      <p className="mb-2 truncate text-sm font-medium">Filters · {card.title}</p>
      <FilterPicker groups={tax.groups} filters={tax.filters} selected={ids} onToggle={toggle} maxHeight={340} autoFocus />
      <p className="mt-2 text-xs text-fg-2">Saved as you click. Esc to close.</p>
    </div>
  );
}

export function CardsAdmin() {
  const toast = useToast();
  const [tax, setTax] = useState<Taxonomy | null>(null);
  const [cards, setCards] = useState<CardWithFilters[]>([]);
  const [opens, setOpens] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");
  const [menu, setMenu] = useState<{ card: CardWithFilters; x: number; y: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, c, o] = await Promise.all([loadTaxonomy(), listCards(), linkOpenCounts()]);
      setTax(t);
      setCards(c);
      setOpens(o);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the database
    load();
  }, [load]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cards.filter(
      (c) =>
        (!section || c.section_id === section) &&
        (!status || c.status === status) &&
        (!needle || c.title.toLowerCase().includes(needle) || c.slug.includes(needle)),
    );
  }, [cards, q, section, status]);

  const move = async (id: string, dir: -1 | 1) => {
    const i = cards.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cards.length) return;
    const next = [...cards];
    [next[i], next[j]] = [next[j], next[i]];
    setCards(next);
    try {
      await reorder("cards", next.map((c) => c.id));
    } catch (e) {
      toast(`Couldn’t reorder: ${(e as Error).message}`);
      load();
    }
  };

  const sectionName = (id: string) => tax?.sections.find((s) => s.id === id);

  return (
    <AdminFrame title="Cards" actions={<ButtonLink href="/admin/cards/new" primary>New card</ButtonLink>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-full border border-[var(--search-border)] bg-[var(--search-bg)] px-3 vh-field">
          <SearchIcon size={18} className="text-fg-2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cards" aria-label="Search cards" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <Select value={section} onChange={(e) => setSection(e.target.value)} aria-label="Section" className="w-auto">
          <option value="">All sections</option>
          {tax?.sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="w-auto">
          <option value="">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
      </div>
      <p className="mb-2 text-xs text-fg-2">Tip: right-click a row to tag filters quickly. Arrows set the manual order.</p>

      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead>
            <tr>
              <th className="w-16">Order</th>
              <th>Card</th>
              <th>Section</th>
              <th>Filters</th>
              <th>Status</th>
              <th className="text-right">Opens</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => {
              const s = sectionName(c.section_id);
              return (
                <tr
                  key={c.id}
                  onContextMenu={(e) => {
                    if (!tax) return;
                    e.preventDefault();
                    setMenu({ card: c, x: e.clientX, y: e.clientY });
                  }}
                  className="hover:bg-hover"
                >
                  <td>
                    <div className="flex flex-col">
                      <button type="button" aria-label={`Move ${c.title} up`} onClick={() => move(c.id, -1)} className="grid size-6 place-items-center rounded hover:bg-chip">
                        <ChevronLeft size={16} className="rotate-90" />
                      </button>
                      <button type="button" aria-label={`Move ${c.title} down`} onClick={() => move(c.id, 1)} className="grid size-6 place-items-center rounded hover:bg-chip">
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="flex min-w-[260px] items-center gap-3">
                      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-[var(--skeleton)]">
                        {parsePreviewClip(c.preview_clip) && <Image src={clipPosterUrl(parsePreviewClip(c.preview_clip)!.url)} alt="" fill sizes="96px" className="object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/cards/${c.id}`} className="line-clamp-2 font-medium hover:underline">
                          {c.title}
                        </Link>
                        <p className="truncate text-xs text-fg-2">/{s?.slug}/{c.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td>{s?.name}</td>
                  <td className="max-w-[220px]">{tax && <FilterSummary ids={c.filter_ids} filters={tax.filters} />}</td>
                  <td>
                    <button
                      type="button"
                      title={c.status === "published" ? "Click to move back to draft" : "Click to publish"}
                      onClick={async () => {
                        const next = c.status === "published" ? "draft" : "published";
                        try {
                          await setCardStatus(c.id, next);
                          setCards((all) => all.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
                        } catch (e) {
                          toast((e as Error).message);
                        }
                      }}
                    >
                      <Badge tone={c.status === "published" ? "green" : "plain"}>{c.status === "published" ? "Published" : "Draft"}</Badge>
                    </button>
                  </td>
                  <td className="text-right tabular-nums">{opens.get(c.id) ?? 0}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <ButtonLink href={`/admin/cards/${c.id}`}>Edit</ButtonLink>
                      {s && c.status === "published" && <ButtonLink href={`/${s.slug}/${c.slug}`}>View</ButtonLink>}
                      <ConfirmButton
                        onConfirm={async () => {
                          try {
                            await deleteCard(c.id);
                            setCards((all) => all.filter((x) => x.id !== c.id));
                            toast("Card deleted");
                          } catch (e) {
                            toast((e as Error).message);
                          }
                        }}
                        confirmLabel="Delete?"
                      >
                        Delete
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tax && shown.length === 0 && (
          <div className="py-16 text-center text-fg-2">
            {cards.length === 0 ? "No cards yet. Create the first one." : "No cards match."}
            {cards.length === 0 && (
              <div className="mt-3">
                <ButtonLink href="/admin/cards/new" primary>
                  New card
                </ButtonLink>
              </div>
            )}
          </div>
        )}
      </div>

      {menu && tax && (
        <TagMenu
          card={menu.card}
          tax={tax}
          at={menu}
          onClose={() => setMenu(null)}
          onSaved={(ids) => setCards((all) => all.map((x) => (x.id === menu.card.id ? { ...x, filter_ids: ids } : x)))}
        />
      )}
    </AdminFrame>
  );
}
