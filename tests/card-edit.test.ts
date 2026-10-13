// Admin "Edit" on cards: who gets the button, and the save path's checks.
// The database side (RLS refusing a non-admin's load and save) is covered in
// supabase/tests/rls_test.sql.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A tiny fake of the Supabase query builder: records calls, returns queued results.
const calls: string[] = [];
let results: { data: unknown; error: null | { message: string } }[] = [];
function builder(): unknown {
  const b: Record<string, unknown> = {};
  for (const m of ["from", "update", "insert", "select", "eq", "maybeSingle", "single", "order"]) {
    b[m] = (...args: unknown[]) => {
      calls.push(`${m}(${args.map((a) => JSON.stringify(a)).join(",")})`);
      return b;
    };
  }
  b.rpc = (name: string) => {
    calls.push(`rpc(${name})`);
    return Promise.resolve(results.shift() ?? { data: null, error: null });
  };
  b.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(results.shift() ?? { data: null, error: null }).then(ok, bad);
  return b;
}
vi.mock("@/lib/supabase/client", () => ({ supabaseBrowser: () => builder() }));

const { canEditCards, CardEditButton } = await import("@/components/card-edit");
const { saveCard, CardConflictError } = await import("@/lib/admin-api");

const input = {
  section_id: "s1",
  slug: "a",
  title: "A",
  description: "",
  media_type: "youtube" as const,
  preview_clip: null,
  audio_preview: null,
  loom_url: null,
  source_url: null,
  status: "published" as const,
};

beforeEach(() => {
  calls.length = 0;
  results = [];
});

describe("who gets the Edit button", () => {
  it("only admins on the real database", () => {
    expect(canEditCards({ role: "admin" }, false)).toBe(true);
    expect(canEditCards({ role: "editor" }, false)).toBe(false);
    expect(canEditCards(null, false)).toBe(false);
    // Sample data has no admin form behind it.
    expect(canEditCards({ role: "admin" }, true)).toBe(false);
  });

  it("renders nothing outside the admin provider (editors never get the button)", () => {
    const html = renderToStaticMarkup(createElement(CardEditButton, { card: { id: "c1", title: "Ped Background" } }));
    expect(html).toBe("");
  });
});

describe("saving from the drawer", () => {
  it("only updates if updated_at is unchanged", async () => {
    results = [{ data: [{ id: "c1" }], error: null }, { data: null, error: null }, { data: null, error: null }];
    await saveCard("c1", input, [], [], "2026-10-13T10:00:00.000001+00:00");
    expect(calls).toContain('eq("updated_at","2026-10-13T10:00:00.000001+00:00")');
    expect(calls).toContain("rpc(admin_set_card_filters)");
  });

  it("reports a conflict and writes nothing else when someone saved meanwhile", async () => {
    results = [
      { data: [], error: null }, // guarded update matched no row
      { data: { updated_at: "2026-10-13T11:00:00+00:00" }, error: null },
    ];
    await expect(saveCard("c1", input, [], [], "2026-10-13T10:00:00+00:00")).rejects.toBeInstanceOf(CardConflictError);
    expect(calls.some((c) => c.startsWith("rpc("))).toBe(false);
  });

  it("refuses when the database rejects the write (non-admin: RLS updates no row)", async () => {
    results = [
      { data: [], error: null },
      { data: { updated_at: "2026-10-13T10:00:00+00:00" }, error: null },
    ];
    await expect(saveCard("c1", input, [], [], "2026-10-13T10:00:00+00:00")).rejects.toThrow(/permission/);
    expect(calls.some((c) => c.startsWith("rpc("))).toBe(false);
  });

  it("the admin panel's own save (no updated_at) is unguarded as before", async () => {
    results = [{ data: [{ id: "c1" }], error: null }];
    await saveCard("c1", input, [], []);
    expect(calls.some((c) => c.startsWith('eq("updated_at"'))).toBe(false);
  });
});
