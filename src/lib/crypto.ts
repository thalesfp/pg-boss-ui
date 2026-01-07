const ALGORITHM = "AES-GCM";
const PBKDF2_ITERATIONS = 600_000; // OWASP recommendation 2023
const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits for GCM

// Encrypted data format version for future migrations
const ENCRYPTION_VERSION = 2;

interface EncryptedPayload {
  version: number;
  salt: string; // base64
  data: string; // base64 (IV + ciphertext)
}

// ============================================================================
// NEW: Password-Based Encryption (Version 2)
// ============================================================================

/**
 * Validate password meets minimum requirements
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters" };
  }
  return { valid: true };
}

/**
 * Derive encryption key from password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: BufferSource
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Derive AES-GCM key
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false, // non-extractable for security
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt data with password-derived key
 */
export async function encryptDataWithPassword(
  data: string,
  password: string
): Promise<string> {
  // Generate new salt for each encryption
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveKeyFromPassword(password, salt);

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(data)
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Create payload with version and salt
  const payload: EncryptedPayload = {
    version: ENCRYPTION_VERSION,
    salt: btoa(String.fromCharCode(...salt)),
    data: btoa(String.fromCharCode(...combined)),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt data with password-derived key
 */
export async function decryptDataWithPassword(
  encryptedData: string,
  password: string
): Promise<string> {
  const payload: EncryptedPayload = JSON.parse(encryptedData);

  // Extract salt
  const salt = new Uint8Array(
    atob(payload.salt)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  // Derive key from password
  const key = await deriveKeyFromPassword(password, salt);

  // Decode data
  const combined = new Uint8Array(
    atob(payload.data)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Check if data is using old encryption method (version 1)
 */
export function isLegacyEncryption(encryptedData: string): boolean {
  try {
    const payload = JSON.parse(encryptedData);
    return !payload.version || payload.version === 1;
  } catch {
    // If it's not JSON, it's the old format (base64 string)
    return true;
  }
}

// ============================================================================
// LEGACY: Browser-Generated Key Encryption (Version 1) - For Migration Only
// ============================================================================

const LEGACY_KEY_STORAGE_NAME = "pg-boss-ui-key";

async function getLegacyKey(): Promise<CryptoKey | null> {
  const storedKey = localStorage.getItem(LEGACY_KEY_STORAGE_NAME);
  if (!storedKey) return null;

  try {
    const keyData = JSON.parse(storedKey);
    return await crypto.subtle.importKey(
      "jwk",
      keyData,
      { name: ALGORITHM },
      true,
      ["encrypt", "decrypt"]
    );
  } catch {
    return null;
  }
}

/**
 * Decrypt data using legacy browser-generated key
 * @deprecated Use only for migration from version 1 to version 2
 */
export async function decryptLegacyData(encryptedData: string): Promise<string> {
  const key = await getLegacyKey();
  if (!key) {
    throw new Error("Legacy encryption key not found");
  }

  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  // Extract IV and encrypted data
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Clean up legacy encryption key after migration
 */
export function removeLegacyKey(): void {
  localStorage.removeItem(LEGACY_KEY_STORAGE_NAME);
}

// ============================================================================
// DEPRECATED: Old encryption functions - kept for backward compatibility
// Remove these after all users have migrated
// ============================================================================

async function getOrCreateKey(): Promise<CryptoKey> {
  const storedKey = localStorage.getItem(LEGACY_KEY_STORAGE_NAME);

  if (storedKey) {
    try {
      const keyData = JSON.parse(storedKey);
      return await crypto.subtle.importKey(
        "jwk",
        keyData,
        { name: ALGORITHM },
        true,
        ["encrypt", "decrypt"]
      );
    } catch {
      // Key corrupted, generate new one
      localStorage.removeItem(LEGACY_KEY_STORAGE_NAME);
    }
  }

  // Generate a new key
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // Export and store the key
  const exportedKey = await crypto.subtle.exportKey("jwk", key);
  localStorage.setItem(LEGACY_KEY_STORAGE_NAME, JSON.stringify(exportedKey));

  return key;
}

/**
 * @deprecated Use encryptDataWithPassword instead
 */
export async function encryptData(data: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(data)
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * @deprecated Use decryptDataWithPassword instead
 */
export async function decryptData(encryptedData: string): Promise<string> {
  const key = await getOrCreateKey();

  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  // Extract IV and encrypted data
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}
