"use client";

// Create / edit a card (R18): title, section, slug (auto, editable), filters,
// YouTube preview + start/end with a live test, Loom tutorial, labelled
// project-file and download links (Mega), source link, description, status.

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
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
import { loomEmbedUrl } from "@/lib/loom";
import { parseYouTubeId } from "@/lib/youtube";
import { CloseIcon } from "../icons";
import { LoomModal } from "../loom-modal";
import { PreviewPlayer } from "../preview-player";
import { useToast } from "../toast";
import { FilterPicker } from "./filter-picker";
import { AdminFrame, Button, ButtonLink, ErrorNote, Field, Input, Panel, Select, Textarea } from "./ui";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SUGGESTED: Record<LinkKind, string[]> = {
  project: ["Premiere Pro", "After Effects", "DaVinci Resolve", "CapCut"],
  download: ["Transparent .mov", ".mp4", "Audio (.wav)", "Font files (.otf)"],
};

interface FormState {
  title: string;
  sectionId: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  youtube: string;
  start: string;
  end: string;
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
  youtube: "",
  start: "0",
  end: "",
  loom: "",
  source: "",
  status: "draft",
  filterIds: new Set(),
  links: [],
};

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

export function CardEditor({ id }: { id?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [tax, setTax] = useState<{ sections: SectionRow[]; groups: GroupRow[]; filters: FilterRow[] } | null>(null);
  const [f, setF] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testKey, setTestKey] = useState(0);
  const [loomOpen, setLoomOpen] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await loadTaxonomy();
        setTax(t);
        if (!id) {
          setF((s) => ({ ...s, sectionId: t.sections[0]?.id ?? "" }));
          return;
        }
        const [card, links] = await Promise.all([getCard(id), getCardLinks(id)]);
        if (!card) return setMissing(true);
        setF({
          title: card.title,
          sectionId: card.section_id,
          slug: card.slug,
          slugTouched: true,
          description: card.description,
          youtube: card.youtube_id ? `https://youtu.be/${card.youtube_id}` : "",
          start: String(card.preview_start),
          end: card.preview_end === null ? "" : String(card.preview_end),
          loom: card.loom_url ?? "",
          source: card.source_url ?? "",
          status: card.status,
          filterIds: new Set(card.filter_ids),
          links,
        });
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [id]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const section = tax?.sections.find((s) => s.id === f.sectionId);
  const youtubeId = f.youtube.trim() ? parseYouTubeId(f.youtube) : null;
  const start = Math.max(0, Math.floor(Number(f.start) || 0));
  const end = f.end.trim() === "" ? null : Math.floor(Number(f.end));

  const problems = useMemo(() => {
    const p: string[] = [];
    if (!f.title.trim()) p.push("Add a title.");
    if (!f.sectionId) p.push("Choose a section.");
    if (!SLUG.test(f.slug)) p.push("The link name may only use lowercase letters, numbers and dashes.");
    if (f.youtube.trim() && !youtubeId) p.push("The YouTube link isn’t recognised.");
    if (end !== null && (Number.isNaN(end) || end <= start)) p.push("The end second must be after the start second.");
    if (f.loom.trim() && !loomEmbedUrl(f.loom)) p.push("The tutorial must be a loom.com share link.");
    if (f.source.trim() && !/^https:\/\//.test(f.source.trim())) p.push("The source link must start with https://");
    for (const l of f.links) {
      if (!l.label.trim()) p.push("Every file link needs a label.");
      if (!/^https:\/\//.test(l.url.trim())) p.push(`“${l.label || "A link"}” must start with https://`);
    }
    return [...new Set(p)];
  }, [f, youtubeId, start, end]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (problems.length) return setError(problems[0]);
    setSaving(true);
    setError(null);
    try {
      await saveCard(
        id ?? null,
        {
          section_id: f.sectionId,
          slug: f.slug,
          title: f.title.trim(),
          description: f.description.trim(),
          youtube_id: youtubeId,
          preview_start: start,
          preview_end: end,
          loom_url: f.loom.trim() || null,
          source_url: f.source.trim() || null,
          status: f.status,
        },
        [...f.filterIds],
        f.links.map((l) => ({ kind: l.kind, label: l.label.trim(), url: l.url.trim() })),
      );
      toast(id ? "Card saved" : "Card created");
      router.push("/admin/cards");
    } catch (err) {
      const msg = (err as Error).message;
      setError(/duplicate|unique/i.test(msg) ? "Another card in this section already uses that link name." : msg);
      setSaving(false);
    }
  };

  if (missing) {
    return (
      <AdminFrame title="Card not found">
        <ButtonLink href="/admin/cards">Back to cards</ButtonLink>
      </AdminFrame>
    );
  }

  return (
    <AdminFrame
      title={id ? "Edit card" : "New card"}
      actions={
        <>
          <ButtonLink href="/admin/cards">Cancel</ButtonLink>
          <Button variant="primary" type="submit" form="card-form" disabled={saving || !tax}>
            {saving ? "Saving…" : f.status === "published" ? "Save and publish" : "Save draft"}
          </Button>
        </>
      }
    >
      <form id="card-form" onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
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
              <Select value={f.sectionId} onChange={(e) => set("sectionId", e.target.value)}>
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

          <Panel className="flex flex-col gap-4">
            <p className="font-medium">Preview (YouTube, unlisted)</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_110px_110px]">
              <Field label="YouTube link">
                <Input value={f.youtube} onChange={(e) => set("youtube", e.target.value)} placeholder="https://youtu.be/…" />
              </Field>
              <Field label="Start (sec)">
                <Input type="number" min={0} value={f.start} onChange={(e) => set("start", e.target.value)} />
              </Field>
              <Field label="End (sec)" hint="Empty = start + 6">
                <Input type="number" min={1} value={f.end} onChange={(e) => set("end", e.target.value)} />
              </Field>
            </div>
            {youtubeId ? (
              <div className="flex flex-col gap-2">
                <div className="relative aspect-video w-full max-w-[560px] overflow-hidden rounded-xl bg-black">
                  {testKey > 0 && (
                    <PreviewPlayer key={testKey} youtubeId={youtubeId} start={start} end={end} active title={f.title || "Preview"} />
                  )}
                  {testKey === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-white/70">Press “Test preview”</p>}
                </div>
                <div>
                  <Button onClick={() => setTestKey((k) => k + 1)}>Test preview</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-fg-2">Paste an unlisted YouTube link to show a looping preview on the card.</p>
            )}
          </Panel>

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
      <LoomModal open={loomOpen} onClose={() => setLoomOpen(false)} title={f.title || "Tutorial"} loomUrl={f.loom} />
    </AdminFrame>
  );
}
