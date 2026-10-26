import Link from "next/link";
import type { ReactNode } from "react";

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="vh-skeleton aspect-video sm:rounded-[var(--radius-thumb)]" />
      <div className="flex flex-col gap-2 max-sm:px-3">
        <div className="vh-skeleton h-4 w-[90%] rounded" />
        <div className="vh-skeleton h-4 w-[60%] rounded" />
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          <div className="vh-skeleton h-9 rounded-full" />
          <div className="vh-skeleton h-9 rounded-full" />
          <div className="vh-skeleton h-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// A hovered card's panel reaches about 16px past it (white panel plus the red
// offset, see .vh-card in globals.css), so desktop columns sit 40px apart and
// a hovered card never covers its neighbour.
export const GRID_CLASS =
  "grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-[repeat(auto-fill,minmax(356px,1fr))] sm:gap-x-10 sm:gap-y-12";

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={GRID_CLASS} role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MessageState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="vh-fade-in mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      {icon && <div className="mb-2 text-fg-2">{icon}</div>}
      <h2 className="text-xl font-medium">{title}</h2>
      {body && <div className="text-fg-2">{body}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function PillLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="vh-press inline-flex h-9 items-center rounded-full bg-chip px-4 text-sm font-medium hover:bg-chip-hover"
    >
      {children}
    </Link>
  );
}
