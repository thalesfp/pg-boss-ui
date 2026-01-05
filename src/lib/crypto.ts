const ALGORITHM = "AES-GCM";
const KEY_STORAGE_NAME = "pg-boss-ui-key";

async function getOrCreateKey(): Promise<CryptoKey> {
  const storedKey = localStorage.getItem(KEY_STORAGE_NAME);

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
      localStorage.removeItem(KEY_STORAGE_NAME);
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
  localStorage.setItem(KEY_STORAGE_NAME, JSON.stringify(exportedKey));

  return key;
}

export async function encryptData(data: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
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

export async function decryptData(encryptedData: string): Promise<string> {
  const key = await getOrCreateKey();

  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}
