import {
  isLegacyEncryption,
  decryptLegacyData,
  encryptDataWithPassword,
  removeLegacyKey,
} from "./crypto";

const STORAGE_NAME = "pg-boss-ui-databases";
const MIGRATION_FLAG_NAME = "pg-boss-ui-migrated";

export type MigrationStatus = "none" | "needed" | "completed";

/**
 * Check if migration from legacy encryption is needed
 */
export function checkMigrationStatus(): MigrationStatus {
  const migrated = localStorage.getItem(MIGRATION_FLAG_NAME);
  if (migrated === "true") {
    return "completed";
  }

  const encryptedData = localStorage.getItem(STORAGE_NAME);
  if (!encryptedData) {
    return "none";
  }

  // Check if data uses legacy encryption
  if (isLegacyEncryption(encryptedData)) {
    return "needed";
  }

  return "none";
}

/**
 * Migrate legacy encrypted data to password-based encryption
 */
export async function migrateLegacyData(password: string): Promise<void> {
  const encryptedData = localStorage.getItem(STORAGE_NAME);
  if (!encryptedData) {
    throw new Error("No data to migrate");
  }

  try {
    // Decrypt with legacy method
    const decryptedData = await decryptLegacyData(encryptedData);

    // Re-encrypt with password-based encryption
    const reEncryptedData = await encryptDataWithPassword(decryptedData, password);

    // Save back to localStorage
    localStorage.setItem(STORAGE_NAME, reEncryptedData);

    // Mark migration as completed
    localStorage.setItem(MIGRATION_FLAG_NAME, "true");

    // Remove legacy key
    removeLegacyKey();
  } catch (error) {
    console.error("Migration failed:", error);
    throw new Error("Failed to migrate data. Your connections may be corrupted.");
  }
}

/**
 * Clear all data (forgot password flow)
 */
export function clearAllData(): void {
  localStorage.removeItem(STORAGE_NAME);
  localStorage.removeItem(MIGRATION_FLAG_NAME);
  removeLegacyKey();
}
