import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RefreshCategory = "stats" | "jobs" | "metrics";

export interface RefreshIntervals {
  stats: number;
  jobs: number;
  metrics: number;
}

export interface HealthThresholds {
  warning: { failed: number; pending: number };
  critical: { failed: number; pending: number };
}

interface PreferencesStore {
  refreshIntervals: RefreshIntervals;
  setRefreshInterval: (category: RefreshCategory, value: number) => void;
  healthThresholds: HealthThresholds;
  setHealthThresholds: (thresholds: HealthThresholds) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      refreshIntervals: {
        stats: 5000,
        jobs: 5000,
        metrics: 10000,
      },

      setRefreshInterval: (category, value) => {
        set((state) => ({
          refreshIntervals: {
            ...state.refreshIntervals,
            [category]: value,
          },
        }));
      },

      healthThresholds: {
        warning: { failed: 10, pending: 100 },
        critical: { failed: 100, pending: 1000 },
      },

      setHealthThresholds: (thresholds) => {
        set({ healthThresholds: thresholds });
      },
    }),
    {
      name: "pg-boss-ui-preferences",
    }
  )
);
