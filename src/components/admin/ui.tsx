"use client";

// Small, consistent building blocks for the admin panel.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/cards", label: "Cards" },
  { href: "/admin/filters", label: "Filters" },
  { href: "/admin/sections", label: "Sections" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/security", label: "2FA" },
];

export function AdminFrame({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-16 max-sm:px-3">
      <title>{`${title} · Admin · RohTre Vault`}</title>
      <nav aria-label="Admin" className="no-scrollbar sticky top-14 z-20 -mx-1.5 flex gap-3 overflow-x-auto bg-bg px-1.5 py-3">
        {TABS.map((t) => {
          const on = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={`vh-press flex h-8 shrink-0 items-center rounded-lg px-3 text-sm font-medium ${
                on ? "bg-chip-on-bg text-chip-on-fg" : "bg-chip hover:bg-chip-hover"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 pt-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "plain" | "danger" | "ghost" };

export function Button({ variant = "plain", className = "", ...rest }: BtnProps) {
  const look = {
    primary: "bg-chip-on-bg text-chip-on-fg enabled:hover:opacity-90",
    plain: "bg-chip enabled:hover:bg-chip-hover",
    danger: "bg-brand text-brand-fg enabled:hover:opacity-90",
    ghost: "enabled:hover:bg-hover",
  }[variant];
  return (
    <button
      type="button"
      {...rest}
      className={`vh-press inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`}
    />
  );
}

export function ButtonLink({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`vh-press inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium ${
        primary ? "bg-chip-on-bg text-chip-on-fg hover:opacity-90" : "bg-chip hover:bg-chip-hover"
      }`}
    >
      {children}
    </Link>
  );
}

/** Two-step confirm without browser dialogs: first click arms, second click acts. */
export function ConfirmButton({ onConfirm, children, confirmLabel = "Click again to confirm", disabled }: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      variant={armed ? "danger" : "ghost"}
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

const FIELD = "w-full rounded-xl border border-[var(--search-border)] bg-[var(--search-bg)] px-3 text-sm outline-none vh-field";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-fg-2">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD} h-10 ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${FIELD} min-h-24 py-2 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${FIELD.replace("rounded-xl", "rounded-full")} h-10 pl-4 pr-3 ${props.className ?? ""}`} />;
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 text-sm"
    >
      <span className={`relative h-5 w-9 rounded-full ${checked ? "bg-brand" : "bg-chip-hover"}`}>
        <span className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform duration-200 ${checked ? "translate-x-4" : ""}`} />
      </span>
      {label}
    </button>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line p-4 ${className}`}>{children}</section>;
}

export function Badge({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "red" | "green" }) {
  const look = {
    plain: "bg-chip text-fg-2",
    red: "bg-[color-mix(in_srgb,var(--brand)_20%,transparent)] text-fg",
    green: "bg-[color-mix(in_srgb,#2ba640_22%,transparent)] text-fg",
  }[tone];
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${look}`}>{children}</span>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] px-3 py-2 text-sm">
      {children}
    </p>
  );
}

export function SampleModeNote() {
  return (
    <Panel>
      <p className="font-medium">The admin panel needs Supabase.</p>
      <p className="mt-1 text-sm text-fg-2">
        Fill in <code>.env.local</code> (see README) and restart the app. Until then the library shows sample data.
      </p>
    </Panel>
  );
}

export const TABLE = "w-full border-collapse text-sm [&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-fg-2";
