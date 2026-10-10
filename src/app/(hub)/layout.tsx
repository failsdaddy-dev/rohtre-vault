import { Suspense } from "react";
import { AppShell, ShellFallback } from "@/components/app-shell";
import { HubProvider } from "@/components/hub-context";
import { ToastProvider } from "@/components/toast";
import { FILTERS, FILTER_GROUPS, SECTIONS } from "@/lib/mock-data";
import type { CurrentUser } from "@/lib/types";

// Stage 1: sample user and data. Stage 3 replaces this with the signed-in
// user's profile, and Stage 4 loads only the sections/filters they may see.
const SAMPLE_USER: CurrentUser = {
  id: "sample-admin",
  email: "owner@example.com",
  displayName: "Studio Owner",
  role: "admin",
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <HubProvider sections={SECTIONS} groups={FILTER_GROUPS} filters={FILTERS} user={SAMPLE_USER}>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </HubProvider>
    </Suspense>
  );
}
