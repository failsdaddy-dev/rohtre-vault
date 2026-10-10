"use client";

// Users (R13, R14, R19): only the admin creates logins. Access is All or a set
// of filters. Disable takes effect immediately (RLS checks is_active, and the
// login is banned so the session can't refresh).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createUser,
  listUsers,
  loadTaxonomy,
  manageUser,
  type FilterRow,
  type GroupRow,
  type UserWithAccess,
} from "@/lib/admin-api";
import { Modal } from "../modal";
import { useHub } from "../hub-context";
import { useToast } from "../toast";
import { FilterPicker, FilterSummary } from "./filter-picker";
import { AdminFrame, Badge, Button, ConfirmButton, ErrorNote, Field, Input, Switch, TABLE } from "./ui";

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function status(u: UserWithAccess): { label: string; tone: "green" | "red" | "plain" } {
  if (!u.is_active) return { label: "Disabled", tone: "red" };
  if (u.expires_at && new Date(u.expires_at) <= new Date()) return { label: "Expired", tone: "red" };
  return { label: "Active", tone: "green" };
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const fromDateInput = (d: string) => (d ? new Date(`${d}T23:59:59`).toISOString() : null);

interface Draft {
  email: string;
  name: string;
  password: string;
  allAccess: boolean;
  filterIds: Set<string>;
  expires: string;
}

function UserForm({
  mode,
  initial,
  groups,
  filters,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial: Draft;
  groups: GroupRow[];
  filters: FilterRow[];
  onCancel: () => void;
  onSubmit: (d: Draft) => Promise<void>;
}) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4 px-5 pb-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!d.allAccess && d.filterIds.size === 0) return setError("Choose at least one filter, or turn on All access.");
        setBusy(true);
        setError(null);
        try {
          await onSubmit(d);
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      {mode === "create" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <Input data-autofocus type="email" required value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
          </Field>
          <Field label="Name">
            <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Karthikeya" />
          </Field>
          <Field label="Temporary password" hint="Share it privately. They must change it at first sign-in." className="sm:col-span-2">
            <div className="flex gap-2">
              <Input required minLength={10} value={d.password} onChange={(e) => setD({ ...d, password: e.target.value })} className="font-mono" />
              <Button onClick={() => setD({ ...d, password: tempPassword() })}>Generate</Button>
              <Button onClick={() => navigator.clipboard.writeText(d.password).catch(() => {})}>Copy</Button>
            </div>
          </Field>
        </div>
      )}
      {mode === "edit" && (
        <Field label="Name">
          <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </Field>
      )}
      <Field label="Account expires on" hint="Optional. The account stops working after this day.">
        <Input type="date" value={d.expires} onChange={(e) => setD({ ...d, expires: e.target.value })} className="w-48" />
      </Field>
      <div className="flex flex-col gap-3">
        <Switch checked={d.allAccess} onChange={(v) => setD({ ...d, allAccess: v })} label="All access (senior editor: sees everything)" />
        {!d.allAccess && (
          <div className="rounded-xl border border-line p-3">
            <p className="mb-2 text-sm font-medium">Can see cards with any of these filters · {d.filterIds.size}</p>
            <FilterPicker
              groups={groups}
              filters={filters}
              selected={d.filterIds}
              maxHeight={260}
              onToggle={(id) => {
                const next = new Set(d.filterIds);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                setD({ ...d, filterIds: next });
              }}
            />
          </div>
        )}
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Saving…" : mode === "create" ? "Create user" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function UsersAdmin() {
  const toast = useToast();
  const { user: me } = useHub();
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [tax, setTax] = useState<{ groups: GroupRow[]; filters: FilterRow[] }>({ groups: [], filters: [] });
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserWithAccess | null>(null);
  const [reset, setReset] = useState<{ user: UserWithAccess; password: string } | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const [u, t] = await Promise.all([listUsers(), loadTaxonomy()]);
      setUsers(u);
      setTax({ groups: t.groups, filters: t.filters });
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the database
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      toast(done);
      await load();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return users.filter((u) => !n || u.email.toLowerCase().includes(n) || u.display_name.toLowerCase().includes(n));
  }, [users, q]);

  return (
    <AdminFrame title="Users" actions={<Button variant="primary" onClick={() => setCreating(true)}>Add user</Button>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" aria-label="Search users" className="mb-4 max-w-md" />
      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Access</th>
              <th>Expires</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => {
              const s = status(u);
              const self = u.id === me.id;
              return (
                <tr key={u.id}>
                  <td>
                    <p className="font-medium">{u.display_name || "—"}</p>
                    <p className="text-xs text-fg-2">{u.email}</p>
                    {u.must_change_password && <p className="text-xs text-fg-2">Hasn’t set their own password yet</p>}
                  </td>
                  <td>{u.role === "admin" ? "Admin" : "Editor"}</td>
                  <td>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </td>
                  <td className="max-w-[240px]">{u.all_access || u.role === "admin" ? "All" : <FilterSummary ids={u.filter_ids} filters={tax.filters} />}</td>
                  <td className="whitespace-nowrap">{u.expires_at ? new Date(u.expires_at).toLocaleDateString() : "Never"}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button onClick={() => setEditing(u)}>Edit</Button>
                      <Button onClick={() => setReset({ user: u, password: tempPassword() })}>Reset password</Button>
                      {!self &&
                        (u.is_active ? (
                          <ConfirmButton onConfirm={() => act(() => manageUser("disable", u.id), `${u.email} is locked out`)} confirmLabel="Disable now?">
                            Disable
                          </ConfirmButton>
                        ) : (
                          <Button onClick={() => act(() => manageUser("enable", u.id), "Re-enabled")}>Enable</Button>
                        ))}
                      {!self && (
                        <ConfirmButton onConfirm={() => act(() => manageUser("delete", u.id), "User deleted")} confirmLabel="Delete forever?">
                          Delete
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Add user">
        {creating && (
          <UserForm
            mode="create"
            initial={{ email: "", name: "", password: tempPassword(), allAccess: false, filterIds: new Set(), expires: "" }}
            groups={tax.groups}
            filters={tax.filters}
            onCancel={() => setCreating(false)}
            onSubmit={async (d) => {
              await createUser({
                email: d.email.trim(),
                password: d.password,
                display_name: d.name.trim(),
                all_access: d.allAccess,
                filter_ids: [...d.filterIds],
                expires_at: fromDateInput(d.expires),
              });
              setCreating(false);
              toast("User created. Share the email and temporary password with them privately.");
              load();
            }}
          />
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit ${editing?.email ?? ""}`}>
        {editing && (
          <UserForm
            mode="edit"
            initial={{
              email: editing.email,
              name: editing.display_name,
              password: "",
              allAccess: editing.all_access,
              filterIds: new Set(editing.filter_ids),
              expires: toDateInput(editing.expires_at),
            }}
            groups={tax.groups}
            filters={tax.filters}
            onCancel={() => setEditing(null)}
            onSubmit={async (d) => {
              await manageUser("update", editing.id, { display_name: d.name, expires_at: fromDateInput(d.expires) });
              if (editing.id !== me.id) {
                await manageUser("set_access", editing.id, { all_access: d.allAccess, filter_ids: [...d.filterIds] });
              }
              setEditing(null);
              toast("Saved");
              load();
            }}
          />
        )}
      </Modal>

      <Modal open={!!reset} onClose={() => setReset(null)} title="Reset password">
        {reset && (
          <div className="flex flex-col gap-4 px-5 pb-5">
            <p className="text-sm">
              New temporary password for <b>{reset.user.email}</b>. They must change it at their next sign-in.
            </p>
            <div className="flex gap-2">
              <Input value={reset.password} onChange={(e) => setReset({ ...reset, password: e.target.value })} className="font-mono" minLength={10} />
              <Button onClick={() => navigator.clipboard.writeText(reset.password).catch(() => {})}>Copy</Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReset(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  const r = reset;
                  setReset(null);
                  act(() => manageUser("reset_password", r.user.id, { password: r.password }), "Password reset");
                }}
              >
                Reset password
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminFrame>
  );
}
