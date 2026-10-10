import { describe, expect, it } from "vitest";
import { cardButtons } from "@/lib/card-buttons";
import { matchesFilters, mockSource } from "@/lib/data-source";
import { loomEmbedUrl } from "@/lib/loom";
import { CARDS, FILTERS } from "@/lib/mock-data";
import type { Card } from "@/lib/types";
import { buildHref, buildQueryString, parseUrlState, toggleFilter } from "@/lib/url-state";
import { parseYouTubeId } from "@/lib/youtube";

const params = (qs: string) => new URLSearchParams(qs);

describe("URL <-> filters round trip (R8)", () => {
  it("parses filters, search and sort", () => {
    expect(parseUrlState(params("f=fc-27,cartoon&q=question"))).toEqual({
      filters: ["cartoon", "fc-27"],
      q: "question",
      sort: "relevance",
    });
  });

  it("builds a canonical, readable link", () => {
    expect(buildHref("effects", { filters: ["fc-27", "cartoon", "cartoon"], q: "question" })).toBe(
      "/effects?f=cartoon,fc-27&q=question",
    );
  });

  it("round-trips any state", () => {
    const states = [
      { filters: [], q: "", sort: "newest" as const },
      { filters: ["ped"], q: "", sort: "manual" as const },
      { filters: ["cartoon", "fc-27", "sample-channel-007"], q: "question mark", sort: "relevance" as const },
      { filters: ["sad"], q: "piano", sort: "newest" as const },
    ];
    for (const s of states) {
      const qs = buildQueryString(s).slice(1);
      expect(parseUrlState(params(qs))).toEqual(s);
    }
  });

  it("drops junk filter values and caps the query", () => {
    const s = parseUrlState(params(`f=Cartoon,<script>,,../x&q=${"a".repeat(500)}`));
    expect(s.filters).toEqual(["cartoon"]);
    expect(s.q.length).toBe(200);
  });

  it("toggles a filter on and off", () => {
    expect(toggleFilter(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleFilter(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("filter combination (Q12: OR inside a group, AND across groups)", () => {
  const card = (filterSlugs: string[]) => ({ filterSlugs }) as Card;
  it("same group = any", () => {
    expect(matchesFilters(card(["fc-20"]), ["fc-20", "fc-27"], FILTERS)).toBe(true);
  });
  it("different groups = all", () => {
    expect(matchesFilters(card(["cartoon"]), ["cartoon", "ped"], FILTERS)).toBe(false);
    expect(matchesFilters(card(["cartoon", "ped"]), ["cartoon", "ped"], FILTERS)).toBe(true);
  });
  it("unknown filter shows nothing, so scoped links never widen", () => {
    expect(matchesFilters(card(["cartoon"]), ["not-a-filter"], FILTERS)).toBe(false);
  });
});

describe("browse (mock source mirrors browse_cards)", () => {
  it("search finds every question-mark effect by prefix", async () => {
    const page = await mockSource.browse({ section: "effects", filters: [], q: "questi", sort: "relevance" });
    expect(page.items.map((c) => c.title)).toContain("Cartoon question mark pop");
  });
  it("paginates with a cursor and no duplicates", async () => {
    const q = { section: "effects", filters: [], q: "", sort: "newest" as const };
    const first = await mockSource.browse(q);
    const second = await mockSource.browse(q, first.next);
    const ids = [...first.items, ...second.items].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(CARDS.filter((c) => c.sectionSlug === "effects").length);
  });
});

describe("greyed buttons (R2)", () => {
  const base = CARDS[0];
  it("disables buttons whose link is not set", () => {
    const [t, p, d] = cardButtons({ ...base, loomUrl: null, hasProjectFiles: false, hasDownloads: true }, "effect");
    expect([t.enabled, p.enabled, d.enabled]).toEqual([false, false, true]);
    expect(d.long).toBe("Download video");
  });
  it("music shows Open on platform instead of Project files (Q8)", () => {
    const [, middle] = cardButtons({ ...base, sourceUrl: "https://example.com" }, "music");
    expect(middle.id).toBe("source");
    expect(middle.enabled).toBe(true);
  });
  it("cards never carry link URLs, only yes/no flags", () => {
    for (const c of CARDS) {
      expect(JSON.stringify(c)).not.toMatch(/mega\.nz/);
    }
  });
});

describe("link parsing", () => {
  it("reads YouTube IDs from common URL forms", () => {
    for (const u of [
      "M7lc1UVf-VE",
      "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      "https://youtu.be/M7lc1UVf-VE",
      "https://www.youtube.com/shorts/M7lc1UVf-VE",
      "https://www.youtube.com/embed/M7lc1UVf-VE?start=3",
    ]) {
      expect(parseYouTubeId(u)).toBe("M7lc1UVf-VE");
    }
    expect(parseYouTubeId("https://example.com/watch?v=M7lc1UVf-VE")).toBeNull();
  });
  it("turns a Loom share link into an embed link", () => {
    expect(loomEmbedUrl("https://www.loom.com/share/abc123")).toMatch(/^https:\/\/www\.loom\.com\/embed\/abc123\?/);
    expect(loomEmbedUrl("https://evil.example/share/abc")).toBeNull();
  });
});

import { safeNext } from "@/lib/url-state";

describe("post-login redirect is same-site only", () => {
  it("keeps internal paths and blocks other sites", () => {
    expect(safeNext("/effects?f=cartoon")).toBe("/effects?f=cartoon");
    expect(safeNext("//evil.example")).toBe("/effects");
    expect(safeNext("https://evil.example")).toBe("/effects");
    expect(safeNext(String.fromCharCode(47, 92) + "evil.example")).toBe("/effects");
    expect(safeNext(null)).toBe("/effects");
  });
});
