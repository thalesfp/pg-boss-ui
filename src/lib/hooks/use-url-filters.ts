"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useState, useEffect, useRef } from "react";
import { subHours } from "date-fns";
import type { DateField, JobState } from "@/lib/db/types";

export interface DashboardFilters {
  startDate: Date | undefined;
  endDate: Date | undefined;
}

export type SortField = "id" | "state" | "priority" | "created_on" | "completed_on";
export type SortOrder = "asc" | "desc";

export interface JobsFilters {
  state: JobState | "all";
  search: string;
  page: number;
  dateField: DateField;
  startDate: Date | undefined;
  endDate: Date | undefined;
  sortBy: SortField;
  sortOrder: SortOrder;
}

function getDefaultDates() {
  const now = new Date();
  return {
    startDate: subHours(now, 24),
    endDate: now,
  };
}

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

export function useDashboardFilters(): [
  DashboardFilters,
  (updates: Partial<DashboardFilters>) => void
] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initializedRef = useRef(false);

  // Local state as source of truth for immediate updates
  const [filters, setFiltersState] = useState<DashboardFilters>(() => {
    const defaults = getDefaultDates();
    const isAllTime = searchParams.get("range") === "all";
    return {
      startDate: isAllTime ? undefined : (parseDate(searchParams.get("startDate")) ?? defaults.startDate),
      endDate: isAllTime ? undefined : (parseDate(searchParams.get("endDate")) ?? defaults.endDate),
    };
  });

  const setFilters = useCallback(
    (updates: Partial<DashboardFilters>) => {
      const newFilters = {
        startDate: "startDate" in updates ? updates.startDate : filters.startDate,
        endDate: "endDate" in updates ? updates.endDate : filters.endDate,
      };

      // Update local state immediately
      setFiltersState(newFilters);

      // Sync to URL for persistence
      const params = new URLSearchParams();
      if (newFilters.startDate === undefined && newFilters.endDate === undefined) {
        // All time mode
        params.set("range", "all");
      } else {
        if (newFilters.startDate) params.set("startDate", newFilters.startDate.toISOString());
        if (newFilters.endDate) params.set("endDate", newFilters.endDate.toISOString());
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [filters, router, pathname]
  );

  // Sync from URL when user navigates via browser back/forward
  useEffect(() => {
    // Skip on first render - we handle that in initialization
    if (!initializedRef.current) return;

    const isAllTime = searchParams.get("range") === "all";
    setFiltersState({
      startDate: isAllTime ? undefined : parseDate(searchParams.get("startDate")),
      endDate: isAllTime ? undefined : parseDate(searchParams.get("endDate")),
    });
  }, [searchParams]);

  // Initialize URL with defaults only on first mount if no params exist
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (searchParams.size === 0) {
      const defaults = getDefaultDates();
      const params = new URLSearchParams();
      params.set("startDate", defaults.startDate.toISOString());
      params.set("endDate", defaults.endDate.toISOString());
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams.size, router, pathname]);

  return [filters, setFilters];
}

export function useJobsFilters(): [
  JobsFilters,
  (updates: Partial<JobsFilters>) => void
] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initializedRef = useRef(false);

  // Local state as source of truth for immediate updates
  const [filters, setFiltersState] = useState<JobsFilters>(() => {
    const defaults = getDefaultDates();
    const isAllTime = searchParams.get("range") === "all";
    return {
      state: (searchParams.get("state") as JobState | "all") || "all",
      search: searchParams.get("search") || "",
      page: parseInt(searchParams.get("page") || "0", 10),
      dateField: (searchParams.get("dateField") as DateField) || "created_on",
      startDate: isAllTime ? undefined : (parseDate(searchParams.get("startDate")) ?? defaults.startDate),
      endDate: isAllTime ? undefined : (parseDate(searchParams.get("endDate")) ?? defaults.endDate),
      sortBy: (searchParams.get("sortBy") as SortField) || "created_on",
      sortOrder: (searchParams.get("sortOrder") as SortOrder) || "desc",
    };
  });

  const setFilters = useCallback(
    (updates: Partial<JobsFilters>) => {
      const newFilters = {
        state: updates.state ?? filters.state,
        search: updates.search !== undefined ? updates.search : filters.search,
        page: updates.page !== undefined ? updates.page : filters.page,
        dateField: updates.dateField ?? filters.dateField,
        startDate: "startDate" in updates ? updates.startDate : filters.startDate,
        endDate: "endDate" in updates ? updates.endDate : filters.endDate,
        sortBy: updates.sortBy ?? filters.sortBy,
        sortOrder: updates.sortOrder ?? filters.sortOrder,
      };

      // Update local state immediately
      setFiltersState(newFilters);

      // Sync to URL for persistence
      const params = new URLSearchParams();
      params.set("state", newFilters.state);
      params.set("search", newFilters.search);
      params.set("page", newFilters.page.toString());
      params.set("dateField", newFilters.dateField);
      if (newFilters.startDate === undefined && newFilters.endDate === undefined) {
        params.set("range", "all");
      } else {
        if (newFilters.startDate) params.set("startDate", newFilters.startDate.toISOString());
        if (newFilters.endDate) params.set("endDate", newFilters.endDate.toISOString());
      }
      params.set("sortBy", newFilters.sortBy);
      params.set("sortOrder", newFilters.sortOrder);

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [filters, router, pathname]
  );

  // Sync from URL when user navigates via browser back/forward
  useEffect(() => {
    // Skip on first render - we handle that in initialization
    if (!initializedRef.current) return;

    const isAllTime = searchParams.get("range") === "all";
    setFiltersState({
      state: (searchParams.get("state") as JobState | "all") || "all",
      search: searchParams.get("search") || "",
      page: parseInt(searchParams.get("page") || "0", 10),
      dateField: (searchParams.get("dateField") as DateField) || "created_on",
      startDate: isAllTime ? undefined : parseDate(searchParams.get("startDate")),
      endDate: isAllTime ? undefined : parseDate(searchParams.get("endDate")),
      sortBy: (searchParams.get("sortBy") as SortField) || "created_on",
      sortOrder: (searchParams.get("sortOrder") as SortOrder) || "desc",
    });
  }, [searchParams]);

  // Initialize URL with defaults only on first mount if no params exist
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (searchParams.size === 0) {
      const defaults = getDefaultDates();
      const params = new URLSearchParams();
      params.set("state", "all");
      params.set("search", "");
      params.set("page", "0");
      params.set("dateField", "created_on");
      params.set("startDate", defaults.startDate.toISOString());
      params.set("endDate", defaults.endDate.toISOString());
      params.set("sortBy", "created_on");
      params.set("sortOrder", "desc");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams.size, router, pathname]);

  return [filters, setFilters];
}
