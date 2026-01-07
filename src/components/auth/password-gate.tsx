"use client";

import { useState, useEffect } from "react";
import { usePassword } from "@/lib/contexts/password-context";
import { MasterPasswordDialog } from "./master-password-dialog";
import { checkMigrationStatus, migrateLegacyData, clearAllData } from "@/lib/migration";
import { setStoragePassword, useDatabaseStore } from "@/lib/stores/database-store";
import { toast } from "sonner";

interface PasswordGateProps {
  children: React.ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const { isUnlocked, setPassword } = usePassword();
  const [mode, setMode] = useState<"unlock" | "setup" | "migrate" | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Determine initial mode
    const migrationStatus = checkMigrationStatus();

    if (migrationStatus === "needed") {
      setMode("migrate");
    } else if (migrationStatus === "none") {
      // Check if there's any data in localStorage
      const hasData = localStorage.getItem("pg-boss-ui-databases") !== null;
      setMode(hasData ? "unlock" : "setup");
    } else {
      // Migration completed, check if data exists
      const hasData = localStorage.getItem("pg-boss-ui-databases") !== null;
      setMode(hasData ? "unlock" : "setup");
    }
  }, []);

  const handlePasswordSubmit = async (password: string) => {
    setIsValidating(true);
    setError(null);

    try {
      if (mode === "migrate") {
        // Migrate legacy data
        await migrateLegacyData(password);
        toast.success("Migration successful! Your connections are now secure.");
      } else if (mode === "setup") {
        // First time setup - just set the password
        // Data will be encrypted on first save
      }

      // Set password in storage (but not context yet - don't unlock until validated)
      setStoragePassword(password);

      // Validate password by attempting hydration (will throw if wrong password)
      await useDatabaseStore.persist.rehydrate();

      // ONLY set password in context AFTER successful validation
      setPassword(password);
      setMode(null);
    } catch (err) {
      console.error("Password validation failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to unlock. Please check your password."
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleForgotPassword = () => {
    if (
      confirm(
        "This will permanently delete all your saved connections. Are you sure you want to continue?"
      )
    ) {
      clearAllData();
      setMode("setup");
      toast.info("All connections cleared. Create a new master password.");
    }
  };

  // Show password dialog if not unlocked
  if (!isUnlocked && mode) {
    return (
      <MasterPasswordDialog
        mode={mode}
        open={true}
        onSuccess={handlePasswordSubmit}
        onForgotPassword={mode === "unlock" ? handleForgotPassword : undefined}
        isValidating={isValidating}
        error={error}
      />
    );
  }

  // Show children once unlocked
  return <>{children}</>;
}
