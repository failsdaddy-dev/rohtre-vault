"use client";

// Create / edit a card (R18): title, section, slug (auto, editable), filters,
// media (video cards: a short preview clip on Cloudinary; audio cards: a
// 30-second MP3 preview on Cloudinary), Loom
// tutorial, labelled project-file and download links (Mega: the real files),
// source link, description, status.
//
// One form, one save, used in two places:
// - variant "page": the admin panel's /admin/cards/new and /admin/cards/[id].
// - variant "drawer": the admin's Edit button on a card (browse grid, card
//   page, video popup, audio player; see card-edit.tsx). There it shows a
//   skeleton and retry while loading, reports unsaved changes, refuses to
//   overwrite a card someone else saved meanwhile (updated_at), and hands
//   the saved card back instead of navigating.

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CardConflictError,
  deletePreviewFile,
  getCard,
  getCardLinks,
  loadTaxonomy,
  saveCard,
  slugify,
  type EditableLink,
  type FilterRow,
  type GroupRow,
  type LinkKind,
  type SectionRow,
} from "@/lib/admin-api";
import { parseAudioPreview, parsePreviewClip } from "@/lib/cloudinary-url";
import type { Json } from "@/lib/database.types";
import { loomEmbedUrl } from "@/lib/loom";
import { CloseIcon } from "../icons";
import { LoomModal } from "../loom-modal";
import { useToast } from "../toast";
import { PreviewUploader, type PreviewValue } from "./preview-uploader";
import { FilterPicker } from "./filter-picker";
import { AdminFrame, Button, ButtonLink, ErrorNote, Field, Input, Panel, Select, Textarea } from "./ui";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SUGGESTED: Record<LinkKind, string[]> = {
  project: ["Premiere Pro", "After Effects", "DaVinci Resolve", "CapCut"],
  download: ["Transparent .mov", ".mp4", "Audio (.wav)", "Font files (.otf)"],
};

/** What the drawer's caller needs to update the card in place. */
export interface SavedCard {
  id: string;
  sectionSlug: string;
  slug: string;
  status: "draft" | "published";
}

interface FormState {
  title: string;
  sectionId: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  mediaType: "youtube" | "audio";
  mediaTouched: boolean;
  clip: PreviewValue;
  audio: PreviewValue;
  loom: string;
  source: string;
  status: "draft" | "published";
  filterIds: Set<string>;
  links: EditableLink[];
}

const EMPTY: FormState = {
  title: "",
  sectionId: "",
  slug: "",
  slugTouched: false,
  description: "",
  mediaType: "youtube",
  mediaTouched: false,
  clip: null,
  audio: null,
  loom: "",
  source: "",
  status: "draft",
  filterIds: new Set(),
  links: [],
};

/** Comparable form contents, for the unsaved-changes check. */
function snapshot(f: FormState): string {
  return JSON.stringify({
    ...f,
    slugTouched: undefined,
    mediaTouched: undefined,
    clip: f.clip?.public_id ?? null,
    audio: f.audio?.public_id ?? null,
    filterIds: [...f.filterIds].sort(),
  });
}

function LinkList({
  kind,
  title,
  hint,
  links,
  onChange,
}: {
  kind: LinkKind;
  title: string;
  hint: string;
  links: EditableLink[];
  onChange: (links: EditableLink[]) => void;
}) {
  const mine = links.map((l, i) => ({ l, i })).filter((x) => x.l.kind === kind);
  const update = (i: number, patch: Partial<EditableLink>) => onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{title}</p>
      <p className="-mt-1 text-xs text-fg-2">{hint}</p>
      {mine.map(({ l, i }) => (
        <div key={i} className="flex flex-wrap gap-2">
          <Input
            value={l.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="Label, e.g. Premiere Pro"
            aria-label={`${title} label`}
            list={`suggest-${kind}`}
            className="w-48"
            maxLength={60}
          />
          <Input
            value={l.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://mega.nz/…"
            aria-label={`${title} link`}
            className="min-w-[220px] flex-1"
            type="url"
          />
          <Button variant="ghost" aria-label="Remove link" onClick={() => onChange(links.filter((_, j) => j !== i))}>
            <CloseIcon size={16} />
          </Button>
        </div>
      ))}
      <datalist id={`suggest-${kind}`}>
        {SUGGESTED[kind].map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div>
        <Button onClick={() => onChange([...links, { kind, label: mine.length ? "" : SUGGESTED[kind][0], url: "" }])}>+ Add link</Button>
      </div>
    </div>
  );
}

/** The preview details saved on the card (drops form-only fields). */
function stored(v: PreviewValue): Json | null {
  if (!v) return null;
  const { saved: _saved, localUrl: _localUrl, ...file } = v;
  void _saved;
  void _localUrl;
  return file as unknown as Json;
}

export function CardEditor({
  id,
  variant = "page",
  onSaved,
  onCancel,
  onDirtyChange,
}: {
  id?: string;
  variant?: "page" | "drawer";
  onSaved?: (card: SavedCard) => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const drawer = variant === "drawer";
  const router = useRouter();
  const toast = useToast();
  const [tax, setTax] = useState<{ sections: SectionRow[]; groups: GroupRow[]; filters: FilterRow[] } | null>(null);
  const [f, setF] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loomOpen, setLoomOpen] = useState(false);
  const [missing, setMissing] = useState(false);
  // Drawer: load state, the card's updated_at as loaded (conflict check) and
  // the form as loaded (unsaved-changes check).
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  // Uploads not yet saved on the card; deleted from Cloudinary if the admin
  // leaves without saving, replaces them, or removes them.
  const unsaved = useRef(new Set<string>());
  // Files the card had when it was loaded; removed from Cloudinary on save
  // once the card no longer uses them.
  const savedIds = useRef(new Set<string>());

  useEffect(() => {
    (async () => {
      try {
        const t = await loadTaxonomy();
        setTax(t);
        if (!id) {
          const first = t.sections[0];
          setF((s) => ({ ...s, sectionId: first?.id ?? "", mediaType: first?.kind === "music" ? "audio" : "youtube" }));
          return;
        }
        const [card, links] = await Promise.all([getCard(id), getCardLinks(id)]);
        if (!card) return setMissing(true);
        const clip = parsePreviewClip(card.preview_clip);
        const audio = parseAudioPreview(card.audio_preview);
        savedIds.current = new Set();
        for (const x of [clip, audio]) if (x) savedIds.current.add(x.public_id);
        const next: FormState = {
          title: card.title,
          sectionId: card.section_id,
          slug: card.slug,
          slugTouched: true,
          description: card.description,
          mediaType: card.media_type,
          mediaTouched: true,
          clip: clip ? { ...clip, saved: true } : null,
          audio: audio ? { ...audio, saved: true } : null,
          loom: card.loom_url ?? "",
          source: card.source_url ?? "",
          status: card.status,
          filterIds: new Set(card.filter_ids),
          links,
        };
        setF(next);
        setBaseline(snapshot(next));
        setLoadedAt(card.updated_at);
        setLoaded(true);
      } catch (e) {
        if (drawer) setLoadError((e as Error).message);
        else setError((e as Error).message);
      }
    })();
  }, [id, attempt, drawer]);

  const dirty = loaded && baseline !== null && snapshot(f) !== baseline;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Leaving without saving: remove uploads that never made it onto the card.
  useEffect(() => {
    const pending = unsaved.current;
    return () => {
      for (const pid of pending) void deletePreviewFile(pid).catch(() => {});
    };
  }, []);

  const setPreview = (key: "clip" | "audio", next: PreviewValue) => {
    setF((s) => {
      const prev = s[key];
      if (prev && !prev.saved && prev.public_id !== next?.public_id) {
        unsaved.current.delete(prev.public_id);
        void deletePreviewFile(prev.public_id).catch(() => {});
      }
      if (next && !next.saved) unsaved.current.add(next.public_id);
      return { ...s, [key]: next };
    });
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const section = tax?.sections.find((s) => s.id === f.sectionId);

  const problems = useMemo(() => {
    const p: string[] = [];
    if (!f.title.trim()) p.push("Add a title.");
    if (!f.sectionId) p.push("Choose a section.");
    if (!SLUG.test(f.slug)) p.push("The link name may only use lowercase letters, numbers and dashes.");
    if (f.loom.trim() && !loomEmbedUrl(f.loom)) p.push("The tutorial must be a loom.com share link.");
    if (f.source.trim() && !/^https:\/\//.test(f.source.trim())) p.push("The source link must start with https://");
    for (const l of f.links) {
      if (!l.label.trim()) p.push("Every file link needs a label.");
      if (!/^https:\/\//.test(l.url.trim())) p.push(`“${l.label || "A link"}” must start with https://`);
    }
    return [...new Set(p)];
  }, [f]);

  const save = async (overwrite: boolean) => {
    if (problems.length) return setError(problems[0]);
    setSaving(true);
    setError(null);
    setConflict(false);
    try {
      await saveCard(
        id ?? null,
        {
          section_id: f.sectionId,
          slug: f.slug,
          title: f.title.trim(),
          description: f.description.trim(),
          media_type: f.mediaType,
          // Only the preview that matches the media type stays on the card.
          preview_clip: f.mediaType === "youtube" ? stored(f.clip) : null,
          audio_preview: f.mediaType === "audio" ? stored(f.audio) : null,
          loom_url: f.loom.trim() || null,
          source_url: f.source.trim() || null,
          status: f.status,
        },
        [...f.filterIds],
        f.links.map((l) => ({ kind: l.kind, label: l.label.trim(), url: l.url.trim() })),
        // The drawer never silently replaces someone else's newer save.
        drawer && !overwrite ? (loadedAt ?? undefined) : undefined,
      );
      // The new files are on the card now; old ones it no longer uses go.
      const current = f.mediaType === "youtube" ? f.clip : f.audio;
      const kept = new Set(current ? [current.public_id] : []);
      for (const pid of kept) unsaved.current.delete(pid);
      for (const pid of savedIds.current) if (!kept.has(pid)) void deletePreviewFile(pid).catch(() => {});
      savedIds.current = kept;
      if (onSaved) {
        onSaved({ id: id ?? "", sectionSlug: section?.slug ?? "", slug: f.slug, status: f.status });
        return;
      }
      toast(id ? "Card saved" : "Card created");
      router.push("/admin/cards");
    } catch (err) {
      setSaving(false);
      if (err instanceof CardConflictError) return setConflict(true);
      const msg = (err as Error).message;
      setError(/duplicate|unique/i.test(msg) ? "Another card in this section already uses that link name." : msg);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save(false);
  };

  // Drawer, after a conflict: drop local edits and load the card as it is now.
  const reloadLatest = () => {
    setConflict(false);
    setError(null);
    setLoaded(false);
    setBaseline(null);
    setAttempt((a) => a + 1);
  };

  if (drawer && loadError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 p-5">
        <p className="font-medium">Couldn’t load this card</p>
        <p className="text-sm text-fg-2">{loadError}</p>
        <Button
          onClick={() => {
            setLoadError(null);
            setAttempt((a) => a + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (missing) {
    if (drawer) {
      return (
        <p role="alert" className="p-5 font-medium">
          This card no longer exists.
        </p>
      );
    }
    return (
      <AdminFrame title="Card not found">
        <ButtonLink href="/admin/cards">Back to cards</ButtonLink>
      </AdminFrame>
    );
  }

  if (drawer && (!loaded || !tax)) {
    return (
      <div role="status" aria-label="Loading card" className="flex flex-col gap-4 p-5">
        <div className="vh-skeleton h-10 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <div className="vh-skeleton h-10 rounded-lg" />
          <div className="vh-skeleton h-10 rounded-lg" />
        </div>
        <div className="vh-skeleton h-24 rounded-lg" />
        <div className="vh-skeleton aspect-video rounded-xl" />
        <div className="vh-skeleton h-32 rounded-lg" />
      </div>
    );
  }

  const saveLabel = saving ? "Saving…" : f.status === "published" ? "Save and publish" : "Save draft";
  const formId = drawer ? "card-form-drawer" : "card-form";

  const form = (
    <form id={formId} onSubmit={submit} className={drawer ? "grid gap-6 p-5" : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"}>
      <div className="flex min-w-0 flex-col gap-6">
        <Panel className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input
              value={f.title}
              required
              maxLength={200}
              placeholder="Cartoon question mark pop"
              onChange={(e) => setF((s) => ({ ...s, title: e.target.value, slug: s.slugTouched ? s.slug : slugify(e.target.value) }))}
            />
          </Field>
          <Field label="Section">
            <Select
              value={f.sectionId}
              onChange={(e) => {
                const id = e.target.value;
                const kind = tax?.sections.find((x) => x.id === id)?.kind;
                // Music defaults to audio, everything else to video, until the admin picks.
                setF((s) => ({ ...s, sectionId: id, mediaType: s.mediaTouched ? s.mediaType : kind === "music" ? "audio" : "youtube" }));
              }}
            >
              {tax?.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Link name" hint={section ? `Shareable link: /${section.slug}/${f.slug || "…"}` : undefined}>
            <Input value={f.slug} onChange={(e) => setF((s) => ({ ...s, slug: slugify(e.target.value), slugTouched: true }))} />
          </Field>
          <Field label="How to use (description)" className="sm:col-span-2">
            <Textarea value={f.description} maxLength={5000} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </Panel>

        <Panel className="flex flex-col gap-3">
          <p className="font-medium">Media</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Media type">
            {(["youtube", "audio"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={f.mediaType === m}
                onClick={() => setF((s) => ({ ...s, mediaType: m, mediaTouched: true }))}
                className={`vh-press h-8 rounded-lg px-3 text-sm font-medium ${f.mediaType === m ? "bg-chip-on-bg text-chip-on-fg" : "bg-chip hover:bg-chip-hover"}`}
              >
                {m === "youtube" ? "Video (clip)" : "Audio (MP3)"}
              </button>
            ))}
          </div>
          <p className="text-xs text-fg-2">
            {f.mediaType === "youtube"
              ? "The card loops a short silent preview clip; clicking it shows the clip bigger with the card’s buttons."
              : "Editors hear a 30-second preview in the site’s player. The full track goes under Downloads (Mega)."}
          </p>
        </Panel>

        {f.mediaType === "youtube" ? (
          <>
            <Panel className="flex flex-col gap-3">
              <p className="font-medium">Preview clip</p>
              <p className="-mt-1 text-xs text-fg-2">
                A short silent loop shown on the card (like CapCut’s effect tiles), with no YouTube buttons. Choose the effect file itself (any size); you pick up to 10 seconds.
              </p>
              <PreviewUploader kind="video" value={f.clip} onChange={(v) => setPreview("clip", v)} title={f.title} />
            </Panel>

          </>
        ) : (
          <Panel className="flex flex-col gap-3">
            <p className="font-medium">Music preview (MP3)</p>
            <p className="-mt-1 text-xs text-fg-2">
              Choose the full track (any size); you pick the 30 seconds and the browser makes a small MP3 preview. Add the full track under Downloads (Mega).
            </p>
            <PreviewUploader kind="audio" value={f.audio} onChange={(v) => setPreview("audio", v)} title={f.title} />
          </Panel>
        )}

        <Panel className="flex flex-col gap-5">
          <Field label="Tutorial (Loom share link)" hint="Leave empty if it isn’t recorded yet. The button then shows greyed out.">
            <div className="flex gap-2">
              <Input value={f.loom} onChange={(e) => set("loom", e.target.value)} placeholder="https://www.loom.com/share/…" />
              <Button disabled={!loomEmbedUrl(f.loom)} onClick={() => setLoomOpen(true)}>
                Test
              </Button>
            </div>
          </Field>
          <LinkList
            kind="project"
            title="Project files"
            hint="One link per software. Kept hidden until an editor clicks; every click is logged."
            links={f.links}
            onChange={(links) => set("links", links)}
          />
          <LinkList
            kind="download"
            title="Downloads"
            hint="The ready-made file itself, e.g. a transparent .mov, the audio or the font."
            links={f.links}
            onChange={(links) => set("links", links)}
          />
          {section?.kind === "music" && (
            <Field label="Open on platform (source link)" hint="E.g. the track on Epidemic Sound.">
              <Input value={f.source} onChange={(e) => set("source", e.target.value)} placeholder="https://…" />
            </Field>
          )}
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <Panel className="flex flex-col gap-3">
          <p className="font-medium">Status</p>
          <div className="flex gap-2">
            {(["draft", "published"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={f.status === s}
                onClick={() => set("status", s)}
                className={`vh-press h-8 rounded-lg px-3 text-sm font-medium ${f.status === s ? "bg-chip-on-bg text-chip-on-fg" : "bg-chip hover:bg-chip-hover"}`}
              >
                {s === "draft" ? "Draft" : "Published"}
              </button>
            ))}
          </div>
          <p className="text-xs text-fg-2">Drafts are visible only to admins.</p>
        </Panel>
        <Panel className="flex flex-col gap-3">
          <p className="font-medium">Filters · {f.filterIds.size}</p>
          {tax && (
            <FilterPicker
              groups={tax.groups}
              filters={tax.filters}
              selected={f.filterIds}
              maxHeight={420}
              onToggle={(fid) =>
                setF((s) => {
                  const next = new Set(s.filterIds);
                  if (next.has(fid)) next.delete(fid);
                  else next.add(fid);
                  return { ...s, filterIds: next };
                })
              }
            />
          )}
          <p className="text-xs text-fg-2">Editors limited to some filters see this card only if it carries one of them.</p>
        </Panel>
        {error && <ErrorNote>{error}</ErrorNote>}
        {!error && problems.length > 0 && f.title && <p className="text-sm text-fg-2">{problems[0]}</p>}
      </div>
    </form>
  );
  const loom = <LoomModal open={loomOpen} onClose={() => setLoomOpen(false)} title={f.title || "Tutorial"} loomUrl={f.loom} />;

  if (drawer) {
    return (
      <>
        {form}
        <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-line bg-menu px-5 py-3">
          {conflict && (
            <div role="alert" className="flex flex-col gap-2 rounded-lg bg-chip p-3 text-sm">
              <p>
                <span className="font-medium">Someone else changed this card since you opened it.</span> Saving now would replace their changes.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={reloadLatest}>Reload latest</Button>
                <Button variant="danger" onClick={() => void save(true)} disabled={saving}>
                  Overwrite anyway
                </Button>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={onCancel}>Cancel</Button>
            <Button variant="primary" type="submit" form={formId} disabled={saving}>
              {saveLabel}
            </Button>
          </div>
        </div>
        {loom}
      </>
    );
  }

  return (
    <AdminFrame
      title={id ? "Edit card" : "New card"}
      actions={
        <>
          <ButtonLink href="/admin/cards">Cancel</ButtonLink>
          <Button variant="primary" type="submit" form={formId} disabled={saving || !tax}>
            {saveLabel}
          </Button>
        </>
      }
    >
      {form}
      {loom}
    </AdminFrame>
  );
}
