"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listAudit, type AuditRow } from "@/lib/admin-api";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AdminFrame, ButtonLink, Panel } from "./ui";

interface Stats {
  published: number;
  drafts: number;
  users: number;
  filters: number;
  recent: AuditRow[];
}

async function counts() {
  const sb = supabaseBrowser();
  const head = { count: "exact" as const, head: true };
  const [pub, drafts, users, filters] = await Promise.all([
    sb.from("cards").select("id", head).eq("status", "published"),
    sb.from("cards").select("id", head).eq("status", "draft"),
    sb.from("profiles").select("id", head),
    sb.from("filters").select("id", head),
  ]);
  return { published: pub.count ?? 0, drafts: drafts.count ?? 0, users: users.count ?? 0, filters: filters.count ?? 0 };
}

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([counts(), listAudit(null, 8)])
      .then(([c, recent]) => setStats({ ...c, recent }))
      .catch(() => setStats({ published: 0, drafts: 0, users: 0, filters: 0, recent: [] }));
  }, []);

  const tiles = [
    { label: "Published cards", value: stats?.published, href: "/admin/cards" },
    { label: "Drafts", value: stats?.drafts, href: "/admin/cards" },
    { label: "Users", value: stats?.users, href: "/admin/users" },
    { label: "Filters", value: stats?.filters, href: "/admin/filters" },
  ];

  return (
    <AdminFrame title="Overview" actions={<ButtonLink href="/admin/cards/new" primary>New card</ButtonLink>}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-xl border border-line p-4 hover:bg-hover">
            <p className="text-sm text-fg-2">{t.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{t.value ?? "–"}</p>
          </Link>
        ))}
      </div>
      <Panel className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Latest activity</h2>
          <Link href="/admin/audit" className="text-sm text-focus hover:underline">
            Full audit log
          </Link>
        </div>
        {stats?.recent.length ? (
          <ul className="divide-y divide-line text-sm">
            {stats.recent.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{a.actor_email ?? "Unknown"}</span> · {a.action.replace(/_/g, " ")}
                </span>
                <time className="text-fg-2" dateTime={a.created_at}>
                  {new Date(a.created_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-2">No activity yet.</p>
        )}
      </Panel>
    </AdminFrame>
  );
}
