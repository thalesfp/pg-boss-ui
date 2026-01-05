"use client";

import { useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { useDatabaseStore } from "@/lib/stores/database-store";
import { toast } from "sonner";

function SessionSync() {
  const { syncSession } = useDatabaseStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for store hydration before syncing
    const unsubscribe = useDatabaseStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // Check if already hydrated
    if (useDatabaseStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    // Sync session on initial load to ensure server session matches client state
    syncSession().catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to sync session"
      );
    });
  }, [hydrated, syncSession]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionSync />
      {children}
      <Toaster />
    </NextThemesProvider>
  );
}
