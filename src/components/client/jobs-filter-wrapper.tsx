"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { useJobsFilters } from "@/lib/hooks/use-url-filters";
import type { DateField } from "@/lib/db/types";

export function JobsFilterWrapper() {
  const [filters, setFilters] = useJobsFilters();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={filters.dateField}
        onValueChange={(v) => setFilters({ dateField: v as DateField, page: 0 })}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_on">Created</SelectItem>
          <SelectItem value="completed_on">Completed</SelectItem>
        </SelectContent>
      </Select>
      <DateRangeFilter
        value={{
          startDate: filters.startDate,
          endDate: filters.endDate,
        }}
        onChange={(v) => setFilters({ ...v, page: 0 })}
      />
    </div>
  );
}
