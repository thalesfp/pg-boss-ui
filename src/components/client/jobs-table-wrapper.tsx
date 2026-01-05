"use client";

import { JobsTable } from "@/components/jobs/jobs-table";
import { useJobsFilters } from "@/lib/hooks/use-url-filters";

interface JobsTableWrapperProps {
  queueName: string;
}

export function JobsTableWrapper({ queueName }: JobsTableWrapperProps) {
  const [filters, setFilters] = useJobsFilters();

  return (
    <JobsTable
      queueName={queueName}
      filters={filters}
      onFiltersChange={setFilters}
    />
  );
}
