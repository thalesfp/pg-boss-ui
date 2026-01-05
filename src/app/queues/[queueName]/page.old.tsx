"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobsTable } from "@/components/jobs/jobs-table";
import { SpeedMetricsCards } from "@/components/metrics/speed-metrics-cards";
import { QueueHealthCard } from "@/components/queues/queue-health-card";
import { useDatabaseStore } from "@/lib/stores/database-store";
import { useJobsFilters } from "@/lib/hooks/use-url-filters";
import { useSpeedMetrics } from "@/lib/hooks/use-speed-metrics";
import { useStats } from "@/lib/hooks/use-stats";
import { useQueues } from "@/lib/hooks/use-queues";
import { ArrowLeft, Database, Settings } from "lucide-react";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import type { DateField } from "@/lib/db/types";

function QueueDetailContent() {
  const params = useParams();
  const router = useRouter();
  const decodedQueueName = decodeURIComponent(params.queueName as string);
  const { getSelectedConnection } = useDatabaseStore();
  const connection = getSelectedConnection();
  const [filters, setFilters] = useJobsFilters();
  const { queues } = useQueues();
  const { metrics: speedMetrics, timeSeries, isLoading: speedLoading } = useSpeedMetrics({
    queueName: decodedQueueName,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  const { stats } = useStats({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  // Calculate pending jobs for this queue
  const pendingJobs = useMemo(() => {
    const queueStats = stats?.queues?.find((q) => q.name === decodedQueueName);
    if (!queueStats) return 0;
    return queueStats.created + queueStats.retry;
  }, [stats, decodedQueueName]);

  // Calculate throughput per minute based on actual elapsed time
  const throughputPerMinute = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return 0;
    const totalCompleted = timeSeries.reduce((sum, t) => sum + t.count, 0);
    const times = timeSeries.map((t) => new Date(t.time).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const elapsedMinutes = (maxTime - minTime) / 60000 + 1; // +1 to include both endpoints
    return elapsedMinutes > 0 ? totalCompleted / elapsedMinutes : 0;
  }, [timeSeries]);

  if (!connection) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              No Database Connected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure a database connection to view jobs.
            </p>
            <Button asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Go to Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/queues">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <Select
              value={decodedQueueName}
              onValueChange={(v) => router.push(`/queues/${encodeURIComponent(v)}`)}
            >
              <SelectTrigger className="w-auto text-2xl font-bold h-auto border-none shadow-none p-0 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {queues.map((q) => (
                  <SelectItem key={q.name} value={q.name}>
                    {q.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground">View and manage jobs in this queue</p>
          </div>
        </div>
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
      </div>

      <QueueHealthCard
          queueName={decodedQueueName}
          startDate={filters.startDate}
          endDate={filters.endDate}
        />

      <SpeedMetricsCards
          metrics={speedMetrics}
          isLoading={speedLoading}
          pendingJobs={pendingJobs}
          throughputPerMinute={throughputPerMinute}
        />

      <JobsTable
        queueName={decodedQueueName}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}

export default function QueueDetailPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <QueueDetailContent />
    </Suspense>
  );
}
