import { Suspense } from "react";
import { AppShell, ShellFallback } from "@/components/app-shell";
import { HubProvider } from "@/components/hub-context";
import { ToastProvider } from "@/components/toast";
import { loadHubData } from "@/lib/hub-data";

// Every page in here needs the signed-in user, so navigations wait for the
// server by design. This turns off Next's "instant navigation" warnings for
// the signed-in area. verified: node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md
export const instant = false;

// Reads the session, so it streams in behind Suspense (Cache Components).
async function SignedInShell({ children }: { children: React.ReactNode }) {
  const data = await loadHubData();
  return (
    <HubProvider {...data}>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </HubProvider>
  );
}

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <SignedInShell>{children}</SignedInShell>
    </Suspense>
  );
}
