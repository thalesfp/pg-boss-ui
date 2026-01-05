"use client";

import useSWR from "swr";
import { useDatabaseStore } from "@/lib/stores/database-store";
import { usePreferencesStore } from "@/lib/stores/preferences-store";
import { apiFetcher } from "@/lib/utils/fetcher";
import type { Queue, QueueStats } from "@/lib/db/types";

interface QueueWithStats extends Queue {
  stats?: QueueStats;
}

export function useQueues() {
  const { getSelectedConnection } = useDatabaseStore();
  const { refreshIntervals } = usePreferencesStore();
  const connection = getSelectedConnection();

  const url = connection ? `/api/queues?connectionId=${connection.id}` : null;

  const { data, error, isLoading, mutate } = useSWR<QueueWithStats[]>(
    url,
    apiFetcher,
    {
      refreshInterval: refreshIntervals.stats || undefined,
      revalidateOnFocus: false,
    }
  );

  return {
    queues: data || [],
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}
