"use client";

import useSWR from "swr";
import { useDatabaseStore } from "@/lib/stores/database-store";
import { usePreferencesStore } from "@/lib/stores/preferences-store";
import { apiFetcher } from "@/lib/utils/fetcher";
// Note: useDatabaseStore is also used in fetcher for session sync
import type { SpeedMetrics, SpeedMetricsOverTime } from "@/lib/db/types";

interface SpeedMetricsResponse {
  metrics: SpeedMetrics;
  timeSeries: SpeedMetricsOverTime[];
}

interface UseSpeedMetricsOptions {
  queueName?: string;
  startDate?: Date;
  endDate?: Date;
  granularity?: "minute" | "hour" | "day";
}

export function useSpeedMetrics(options: UseSpeedMetricsOptions = {}) {
  const { getSelectedConnection } = useDatabaseStore();
  const { refreshIntervals } = usePreferencesStore();
  const connection = getSelectedConnection();
  const { queueName, startDate, endDate, granularity } = options;

  const params = new URLSearchParams();
  if (queueName) params.set("queueName", queueName);
  if (granularity) params.set("granularity", granularity);
  if (startDate === undefined && endDate === undefined) {
    // All time mode
    params.set("range", "all");
  } else {
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());
  }

  const url = connection ? `/api/metrics?connectionId=${connection.id}&${params}` : null;

  const { data, error, isLoading, mutate } = useSWR<SpeedMetricsResponse>(
    url,
    apiFetcher,
    {
      refreshInterval: refreshIntervals.metrics || undefined,
      revalidateOnFocus: false,
    }
  );

  return {
    metrics: data?.metrics,
    timeSeries: data?.timeSeries,
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}
