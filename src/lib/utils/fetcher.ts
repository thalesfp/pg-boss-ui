import { useDatabaseStore } from "@/lib/stores/database-store";

/**
 * Custom error class for API fetch errors
 */
export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public isSessionExpired: boolean = false
  ) {
    super(message);
    this.name = "FetchError";
  }
}

/**
 * Unified API fetcher with session management and error handling
 * Automatically handles 409 (session expired) errors by syncing the session
 * @param url - The URL to fetch
 * @returns Parsed JSON response
 * @throws {FetchError} If the request fails
 */
export async function apiFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);

  // Handle session expiration (409 Conflict)
  if (res.status === 409) {
    await useDatabaseStore.getState().syncSession();
    throw new FetchError("Session expired. Retrying...", 409, true);
  }

  // Handle other errors
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: undefined }));
    const message = data.error || `Request failed with status ${res.status}`;
    throw new FetchError(message, res.status);
  }

  return res.json();
}

/**
 * Create a typed fetcher function for use with SWR
 * @returns A fetcher function that can be used with useSWR
 */
export function createFetcher<T>() {
  return (url: string) => apiFetcher<T>(url);
}
