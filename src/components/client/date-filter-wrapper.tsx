"use client";

import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { useDashboardFilters } from "@/lib/hooks/use-url-filters";

export function DateFilterWrapper() {
  const [filters, setFilters] = useDashboardFilters();

  return (
    <DateRangeFilter
      value={{
        startDate: filters.startDate,
        endDate: filters.endDate,
      }}
      onChange={(value) => setFilters(value)}
    />
  );
}
