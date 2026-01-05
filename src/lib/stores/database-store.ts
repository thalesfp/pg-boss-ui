import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { mutate } from "swr";
import { encryptData, decryptData } from "../crypto";

// Invalidate all SWR cache to force refetch with new connection
async function invalidateAllCache(): Promise<void> {
  await mutate(() => true, undefined, { revalidate: true });
}

export interface DatabaseConnection {
  id: string;
  name: string;
  connectionString: string;
  schema: string;
}

interface DatabaseStore {
  connections: DatabaseConnection[];
  selectedId: string | null;
  addConnection: (connection: Omit<DatabaseConnection, "id">) => Promise<string>;
  updateConnection: (id: string, connection: Partial<DatabaseConnection>) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  setSelectedId: (id: string | null) => Promise<void>;
  getSelectedConnection: () => DatabaseConnection | null;
  syncSession: () => Promise<void>;
}

async function updateSession(connection: DatabaseConnection | null): Promise<void> {
  if (connection) {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connectionId: connection.id,
        connectionString: connection.connectionString,
        schema: connection.schema,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update session");
    }
  } else {
    const res = await fetch("/api/session", { method: "DELETE" });
    if (!res.ok) {
      throw new Error("Failed to clear session");
    }
  }
}

const STORAGE_NAME = "pg-boss-ui-databases";

const encryptedStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const encrypted = localStorage.getItem(name);
    if (!encrypted) return null;

    try {
      const decrypted = await decryptData(encrypted);
      return decrypted;
    } catch {
      // Decryption failed (key changed or data corrupted), clear storage
      localStorage.removeItem(name);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const encrypted = await encryptData(value);
    localStorage.setItem(name, encrypted);
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

export const useDatabaseStore = create<DatabaseStore>()(
  persist(
    (set, get) => ({
      connections: [],
      selectedId: null,

      addConnection: async (connection) => {
        const id = crypto.randomUUID();
        const newConnection = { ...connection, id };
        const isFirst = get().connections.length === 0;

        set((state) => ({
          connections: [...state.connections, newConnection],
          selectedId: state.selectedId || id,
        }));

        // If this is the first connection, sync the session
        if (isFirst) {
          try {
            await updateSession(newConnection);
            // Invalidate cache to reload data with new connection
            await invalidateAllCache();
          } catch (error) {
            // Revert: remove the connection we just added
            set({ connections: [], selectedId: null });
            throw error;
          }
        }

        return id;
      },

      updateConnection: async (id, connection) => {
        const state = get();
        const previousConnections = state.connections;
        const isSelected = state.selectedId === id;

        // Update local state
        const updatedConnections = state.connections.map((conn) =>
          conn.id === id ? { ...conn, ...connection } : conn
        );
        set({ connections: updatedConnections });

        // Sync session if the updated connection is currently selected
        if (isSelected) {
          const updatedConnection = updatedConnections.find((c) => c.id === id);
          try {
            await updateSession(updatedConnection || null);
            // Invalidate cache to reload data with updated connection
            await invalidateAllCache();
          } catch (error) {
            // Revert on failure
            set({ connections: previousConnections });
            throw error;
          }
        }
      },

      removeConnection: async (id) => {
        const state = get();
        const removedConnection = state.connections.find(
          (conn) => conn.id === id
        );
        const newConnections = state.connections.filter(
          (conn) => conn.id !== id
        );
        const wasSelected = state.selectedId === id;
        const newSelectedId = wasSelected
          ? newConnections[0]?.id || null
          : state.selectedId;

        set({
          connections: newConnections,
          selectedId: newSelectedId,
        });

        // Update session if the removed connection was selected
        if (wasSelected) {
          const newSelectedConnection = newConnections.find(
            (conn) => conn.id === newSelectedId
          );
          try {
            await updateSession(newSelectedConnection || null);
            // Invalidate cache to reload data with new connection
            await invalidateAllCache();
          } catch (error) {
            // Revert: re-add the removed connection
            if (removedConnection) {
              set({
                connections: state.connections,
                selectedId: state.selectedId,
              });
            }
            throw error;
          }
        }
      },

      setSelectedId: async (id) => {
        const previousId = get().selectedId;
        const connection = id
          ? get().connections.find((conn) => conn.id === id)
          : null;

        set({ selectedId: id });

        try {
          await updateSession(connection || null);
          // Invalidate cache to reload data with new connection
          await invalidateAllCache();
        } catch (error) {
          set({ selectedId: previousId });
          throw error;
        }
      },

      getSelectedConnection: () => {
        const state = get();
        return (
          state.connections.find((conn) => conn.id === state.selectedId) || null
        );
      },

      syncSession: async () => {
        const connection = get().getSelectedConnection();
        await updateSession(connection);
      },
    }),
    {
      name: STORAGE_NAME,
      storage: createJSONStorage(() => encryptedStorage),
    }
  )
);
