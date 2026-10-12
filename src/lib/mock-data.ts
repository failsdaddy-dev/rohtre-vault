// Sample content for Stage 1 (UI on mock data). Replaced by Supabase in Stage 4.
// Sections and starting filters match supabase/seed.sql.

import type { Card, Filter, FilterGroup, LinkLabel, Section } from "./types";

export const SECTIONS: Section[] = [
  { slug: "effects", name: "Effects", kind: "effect" },
  { slug: "music", name: "Music", kind: "music" },
  { slug: "sound-effects", name: "Sound effects", kind: "sound" },
  { slug: "fonts", name: "Fonts", kind: "font" },
  { slug: "text-graphics", name: "Text & graphics", kind: "text" },
];

export const FILTER_GROUPS: FilterGroup[] = [
  { id: "g-game", slug: "game", name: "Game" },
  { id: "g-style", slug: "style", name: "Style" },
  { id: "g-client", slug: "client", name: "Client/channel" },
  { id: "g-software", slug: "software", name: "Software" },
  { id: "g-mood", slug: "mood", name: "Music mood" },
];

const base: Array<[string, string, string, boolean]> = [
  ["g-game", "fc-27", "FC 27", true],
  ["g-game", "fc-20", "FC 20", true],
  ["g-style", "cartoon", "Cartoon", true],
  ["g-style", "documentary", "Documentary", true],
  ["g-style", "sports", "Sports", true],
  ["g-client", "ped", "PED", true],
  ["g-software", "premiere-pro", "Premiere Pro", true],
  ["g-software", "after-effects", "After Effects", true],
  ["g-mood", "sad", "Sad", false],
  ["g-mood", "documentary-music", "Documentary", false],
  ["g-mood", "funny-drop", "Funny drop", false],
  ["g-mood", "happy", "Happy", false],
];

// Many sample channels, to exercise the "More filters" panel at scale.
const sampleChannels: Array<[string, string, string, boolean]> = Array.from({ length: 120 }, (_, i) => {
  const n = String(i + 1).padStart(3, "0");
  return ["g-client", `sample-channel-${n}`, `Sample channel ${n}`, false];
});

export const FILTERS: Filter[] = [...base, ...sampleChannels].map(([groupId, slug, name, isQuick]) => ({
  id: `f-${slug}`,
  groupId,
  slug,
  name,
  isQuick,
}));


type Seed = [section: string, title: string, filters: string[], opts?: Partial<Card>];

const seeds: Seed[] = [
  ["effects", "Cartoon question mark pop", ["cartoon", "fc-27", "premiere-pro", "ped"]],
  ["effects", "TV documentary football screen", ["documentary", "fc-27", "after-effects"]],
  ["effects", "Circle & marker highlight", ["sports", "premiere-pro"]],
  ["effects", "Yellow arrow pointer", ["cartoon", "premiere-pro"]],
  ["effects", "White arrow pointer", ["sports", "premiere-pro", "fc-20"]],
  ["effects", "Paper rip transition", ["documentary", "after-effects"]],
  ["effects", "Glitch flash transition", ["sports", "fc-27", "after-effects"]],
  ["effects", "Green FC 27 lower third", ["fc-27", "after-effects", "ped"]],
  ["effects", "Purple stat card reveal", ["fc-27", "after-effects"]],
  ["effects", "Cartoon impact stars", ["cartoon", "premiere-pro", "ped"]],
  ["effects", "Cartoon sweat drop", ["cartoon", "premiere-pro"]],
  ["effects", "Player spotlight zoom", ["sports", "fc-20", "premiere-pro"]],
  ["effects", "Old film burn", ["documentary", "premiere-pro"]],
  ["effects", "Newspaper headline spin", ["documentary", "after-effects"]],
  ["effects", "Scoreboard flip", ["sports", "fc-27", "after-effects"]],
  ["effects", "Cartoon exclamation bounce", ["cartoon", "fc-20", "premiere-pro"]],
  ["effects", "Map route draw", ["documentary", "after-effects"]],
  ["effects", "Camera shake punch-in", ["sports", "premiere-pro", "sample-channel-007"]],
  ["effects", "Speed lines burst", ["cartoon", "sports", "after-effects"]],
  ["effects", "Red X cross-out", ["cartoon", "premiere-pro", "sample-channel-012"]],
  ["effects", "Polaroid photo drop", ["documentary", "premiere-pro"]],
  ["effects", "Trophy shine sweep", ["sports", "fc-27", "after-effects"]],
  ["effects", "VHS rewind", ["documentary", "fc-20", "premiere-pro"]],
  ["effects", "Cartoon dizzy stars", ["cartoon", "premiere-pro", "ped"]],
  ["effects", "Split-screen compare", ["sports", "fc-27", "premiere-pro"]],
  ["effects", "Typewriter caption", ["documentary", "premiere-pro"]],
  ["effects", "Neon outline trace", ["fc-27", "after-effects"]],
  ["effects", "Emoji reaction pop", ["cartoon", "premiere-pro"]],
  ["effects", "Ball trail tracer", ["sports", "fc-20", "after-effects"]],
  ["effects", "Spotlight vignette", ["documentary", "premiere-pro"]],
  ["music", "Sad piano bed", ["sad", "documentary-music"], { sourceUrl: "https://www.epidemicsound.com/" }],
  ["music", "Documentary pulse", ["documentary-music"], { sourceUrl: "https://www.epidemicsound.com/" }],
  ["music", "Funny drop: cartoon boing", ["funny-drop", "cartoon"], { sourceUrl: "https://www.epidemicsound.com/" }],
  ["music", "Happy ukulele loop", ["happy"], { sourceUrl: "https://www.epidemicsound.com/" }],
  ["music", "Tense build-up", ["documentary-music", "sports"], { sourceUrl: "https://www.epidemicsound.com/" }],
  ["music", "Sad strings outro", ["sad"], { sourceUrl: "https://www.epidemicsound.com/" }],
  ["music", "Victory anthem", ["happy", "sports", "fc-27"], { sourceUrl: "https://www.epidemicsound.com/" }],
  ["music", "Funny drop: record scratch", ["funny-drop"], { sourceUrl: "https://www.epidemicsound.com/" }],
  ["sound-effects", "Record scratch", ["cartoon", "funny-drop"]],
  ["sound-effects", "Crowd cheer", ["sports", "fc-27"]],
  ["sound-effects", "Bonk", ["cartoon"]],
  ["sound-effects", "Whoosh fast", ["sports"]],
  ["sound-effects", "Dramatic sting", ["documentary"]],
  ["sound-effects", "Referee whistle", ["sports", "fc-20"]],
  ["fonts", "Montserrat ExtraBold", ["fc-27", "documentary"]],
  ["fonts", "Bebas Neue", ["sports"]],
  ["fonts", "Bangers", ["cartoon"]],
  ["fonts", "Oswald", ["documentary", "ped"]],
  ["text-graphics", "Green FC 27 title card", ["fc-27", "after-effects"]],
  ["text-graphics", "Purple stat strip", ["fc-27", "after-effects"]],
  ["text-graphics", "Documentary chapter title", ["documentary", "premiere-pro"]],
  ["text-graphics", "Cartoon speech bubble", ["cartoon", "premiere-pro", "ped"]],
];

const descriptions: Record<string, string> = {
  effect: "Approved studio effect. Watch the tutorial once, then use the project file or the ready-made video.",
  music: "Approved track. Use only tracks from this library for this mood.",
  sound: "Approved sound effect for the meme soundboard.",
  font: "Approved font. Install it from the download before you start the edit.",
  text: "Approved text and graphics preset.",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const start = Date.parse("2026-10-09T12:00:00Z");

// Sample mode: video cards loop Cloudinary's public demo clip; audio cards
// play a short tone generated in the browser.
export const SAMPLE_TONE_SECONDS = 12;
const SAMPLE_CLIP = {
  url: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
  public_id: "rohtre-vault/previews/sample",
  version: 1,
  format: "mp4",
  bytes: 1_500_000,
  duration: 10,
};
const SAMPLE_AUDIO = {
  url: "https://res.cloudinary.com/demo/video/upload/sample.mp3",
  version: 1,
  format: "mp3",
  bytes: 600_000,
  duration: SAMPLE_TONE_SECONDS,
};

function samplePeaks(seed: number): number[] {
  return Array.from({ length: 120 }, (_, k) => 0.25 + 0.7 * Math.abs(Math.sin((k + seed * 7) * 0.21) * Math.cos(k * 0.047)));
}

const toneCache = new Map<string, string>();

/** A WAV tone (two notes per card) as a blob URL, built in the browser. */
export function sampleToneUrl(cardId: string): string {
  const hit = toneCache.get(cardId);
  if (hit) return hit;
  const rate = 22050;
  const n = rate * SAMPLE_TONE_SECONDS;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, k) => v.setUint8(o + k, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, n * 2, true);
  const base = 220 + (parseInt(cardId.replace(/\D/g, ""), 10) % 8) * 30;
  for (let k = 0; k < n; k++) {
    const t = k / rate;
    const f = Math.floor(t * 2) % 2 ? base * 1.5 : base;
    const env = Math.min(1, (t % 0.5) * 20) * Math.exp(-(t % 0.5) * 4);
    v.setInt16(44 + k * 2, Math.sin(2 * Math.PI * f * t) * env * 9000, true);
  }
  const url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  toneCache.set(cardId, url);
  return url;
}

export const CARDS: Card[] = seeds.map(([section, title, filters, opts], i) => {
  const kind = SECTIONS.find((s) => s.slug === section)!.kind;
  const audio = kind === "music" || (kind === "sound" && i % 2 === 0);
  return {
    id: `c-${String(i + 1).padStart(3, "0")}`,
    sectionSlug: section,
    slug: slugify(title),
    title,
    description: descriptions[kind],
    mediaType: audio ? "audio" : "youtube",
    // Some tutorials are "not recorded yet" so their buttons show greyed out.
    loomUrl: i % 4 === 3 ? null : "https://www.loom.com/share/0000000000000000000000000000demo",
    sourceUrl: null,
    hasProjectFiles: kind !== "music" && kind !== "sound" && i % 5 !== 4,
    hasDownloads: i % 6 !== 5,
    // Sample clips come from Cloudinary's public demo account.
    previewClip: !audio && i % 3 !== 2 ? SAMPLE_CLIP : null,
    audioPreview:
      audio && i % 5 !== 4
        ? { ...SAMPLE_AUDIO, public_id: `rohtre-vault/music/sample-${i}`, peaks: samplePeaks(i) }
        : null,
    filterSlugs: [...filters].sort(),
    publishedAt: new Date(start - i * 7.5 * 3600_000).toISOString(),
    ...opts,
  };
});

export function mockLinkLabels(card: Card): LinkLabel[] {
  const out: LinkLabel[] = [];
  if (card.hasProjectFiles) {
    out.push({ id: `${card.id}-p1`, kind: "project", label: "Premiere Pro" });
    if (card.filterSlugs.includes("after-effects")) {
      out.push({ id: `${card.id}-p2`, kind: "project", label: "After Effects" });
    }
  }
  if (card.hasDownloads) {
    const section = SECTIONS.find((s) => s.slug === card.sectionSlug)!;
    if (section.kind === "font") out.push({ id: `${card.id}-d1`, kind: "download", label: "Font files (.otf)" });
    else if (section.kind === "music" || section.kind === "sound")
      out.push({ id: `${card.id}-d1`, kind: "download", label: "Audio (.wav)" });
    else {
      out.push({ id: `${card.id}-d1`, kind: "download", label: "Transparent .mov" });
      out.push({ id: `${card.id}-d2`, kind: "download", label: ".mp4" });
    }
  }
  return out;
}
