import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scryptSync,
} from "crypto";

export interface SessionData {
  connectionId: string;
  connectionString: string;
  schema: string;
  allowSelfSignedCert?: boolean;
  caCertificate?: string;
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-secret-change-in-production"
);

const COOKIE_NAME = "pg-boss-session";

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "dev-secret-change-in-production") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production");
    }
    console.warn("Using default session secret - not safe for production");
  }
  return scryptSync(secret || "dev-secret-change-in-production", "salt", 32);
}

function encrypt(data: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Combine iv:authTag:encryptedData into a single string
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(combined: string): string {
  const [ivHex, authTagHex, encryptedData] = combined.split(":");

  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export async function setSession(data: SessionData): Promise<void> {
  // Encrypt credentials and embed in JWT
  const encryptedCredentials = encrypt(JSON.stringify(data));

  const token = await new SignJWT({ credentials: encryptedCredentials })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const encryptedCredentials = payload.credentials as string;

    if (!encryptedCredentials) {
      return null;
    }

    // Decrypt credentials from JWT payload
    const decrypted = decrypt(encryptedCredentials);
    return JSON.parse(decrypted) as SessionData;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function validateSessionConnection(
  requestConnectionId: string | null
): Promise<{ session: SessionData } | { error: string; status: number }> {
  const session = await getSession();

  if (!session) {
    return { error: "No active connection", status: 401 };
  }

  if (requestConnectionId && requestConnectionId !== session.connectionId) {
    return {
      error: "Session connection mismatch. Please refresh.",
      status: 409
    };
  }

  return { session };
}
