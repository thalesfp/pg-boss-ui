"use client";

import useSWR from "swr";
import { useDatabaseStore } from "@/lib/stores/database-store";
import { usePreferencesStore } from "@/lib/stores/preferences-store";
import { apiFetcher } from "@/lib/utils/fetcher";
import type { DashboardStats, ThroughputDataPoint } from "@/lib/db/types";

interface StatsResponse {
  stats: DashboardStats;
  throughput: ThroughputDataPoint[];
}

interface UseStatsOptions {
  startDate?: Date;
  endDate?: Date;
}

export function useStats(options: UseStatsOptions = {}) {
  const { getSelectedConnection } = useDatabaseStore();
  const { refreshIntervals } = usePreferencesStore();
  const connection = getSelectedConnection();
  const { startDate, endDate } = options;

  const params = new URLSearchParams();
  if (startDate === undefined && endDate === undefined) {
    // All time mode
    params.set("range", "all");
  } else {
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());
  }

  const url = connection ? `/api/stats?connectionId=${connection.id}&${params}` : null;

  const { data, error, isLoading, mutate } = useSWR<StatsResponse>(
    url,
    apiFetcher,
    {
      refreshInterval: refreshIntervals.stats || undefined,
      revalidateOnFocus: false,
    }
  );

  return {
    stats: data?.stats,
    throughput: data?.throughput,
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}
