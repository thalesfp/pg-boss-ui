"use client";

import { useState, useEffect } from "react";
import { JobsTable } from "@/components/jobs/jobs-table";
import { useJobsFilters } from "@/lib/hooks/use-url-filters";

interface JobsTableWrapperProps {
  queueName: string;
}

export function JobsTableWrapper({ queueName }: JobsTableWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useJobsFilters();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show skeleton loaders until hydration completes
  // This prevents server/client HTML mismatch
  if (!mounted) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 w-full animate-pulse bg-muted rounded" />
        ))}
      </div>
    );
  }

  return (
    <JobsTable
      queueName={queueName}
      filters={filters}
      onFiltersChange={setFilters}
    />
  );
}
