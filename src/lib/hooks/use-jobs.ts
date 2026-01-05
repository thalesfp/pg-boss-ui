"use client";

import useSWR from "swr";
import { useDatabaseStore } from "@/lib/stores/database-store";
import { usePreferencesStore } from "@/lib/stores/preferences-store";
import { apiFetcher } from "@/lib/utils/fetcher";
import type { Job, JobState, DateField } from "@/lib/db/types";

interface JobsResponse {
  jobs: Job[];
  total: number;
}

type SortField = "id" | "state" | "priority" | "created_on" | "completed_on";
type SortOrder = "asc" | "desc";

interface UseJobsOptions {
  queueName?: string;
  state?: JobState;
  limit?: number;
  offset?: number;
  search?: string;
  dateField?: DateField;
  startDate?: Date;
  endDate?: Date;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export function useJobs(options: UseJobsOptions = {}) {
  const { getSelectedConnection } = useDatabaseStore();
  const { refreshIntervals } = usePreferencesStore();
  const connection = getSelectedConnection();
  const {
    queueName,
    state,
    limit = 50,
    offset = 0,
    search,
    dateField,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  } = options;

  const params = new URLSearchParams();
  if (queueName) params.set("queueName", queueName);
  if (state) params.set("state", state);
  params.set("limit", limit.toString());
  params.set("offset", offset.toString());
  if (search) params.set("search", search);
  if (dateField) params.set("dateField", dateField);
  if (startDate) params.set("startDate", startDate.toISOString());
  if (endDate) params.set("endDate", endDate.toISOString());
  if (sortBy) params.set("sortBy", sortBy);
  if (sortOrder) params.set("sortOrder", sortOrder);

  const url = connection ? `/api/jobs?connectionId=${connection.id}&${params}` : null;

  const { data, error, isLoading, mutate } = useSWR<JobsResponse>(
    url,
    apiFetcher,
    {
      refreshInterval: refreshIntervals.jobs || undefined,
      revalidateOnFocus: false,
    }
  );

  return {
    jobs: data?.jobs || [],
    total: data?.total || 0,
    isLoading,
    error: error?.message,
    refresh: mutate,
  };
}

interface UseJobOptions {
  jobId: string;
}

export function useJob({ jobId }: UseJobOptions) {
  const { getSelectedConnection } = useDatabaseStore();
  const connection = getSelectedConnection();

  const url = connection
    ? `/api/jobs?connectionId=${connection.id}&jobId=${jobId}`
    : null;

  const { data, error, isLoading } = useSWR<Job>(
    url,
    apiFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    job: data,
    isLoading,
    error: error?.message,
  };
}
