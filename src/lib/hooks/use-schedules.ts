"use client";

import useSWR from "swr";
import { useDatabaseStore } from "@/lib/stores/database-store";
import { usePreferencesStore } from "@/lib/stores/preferences-store";
import { apiFetcher } from "@/lib/utils/fetcher";
import type { Schedule } from "@/lib/db/types";

export function useSchedules() {
  const { getSelectedConnection } = useDatabaseStore();
  const { refreshIntervals } = usePreferencesStore();
  const connection = getSelectedConnection();

  const url = connection ? `/api/schedules?connectionId=${connection.id}` : null;

  const { data, error, isLoading, mutate } = useSWR<Schedule[]>(url, apiFetcher, {
    refreshInterval: refreshIntervals.metrics || undefined,
    revalidateOnFocus: false,
  });

  return {
    schedules: data || [],
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}
