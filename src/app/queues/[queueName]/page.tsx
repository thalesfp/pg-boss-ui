import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobsTableWrapper } from "@/components/client/jobs-table-wrapper";
import { SpeedMetricsCards } from "@/components/metrics/speed-metrics-cards";
import { QueueHealthCardWrapper } from "@/components/client/queue-health-card-wrapper";
import { QueueSelector } from "@/components/client/queue-selector";
import { JobsFilterWrapper } from "@/components/client/jobs-filter-wrapper";
import { getSession } from "@/lib/session";
import { getQueuesData, getQueueStatsData } from "@/lib/data/queues";
import { getMetricsData } from "@/lib/data/metrics";
import { calculateThroughputFromTimeSeries } from "@/lib/domain/metrics";
import { ArrowLeft, Database, Settings } from "lucide-react";

interface QueueDetailPageProps {
  params: Promise<{ queueName: string }>;
  searchParams: Promise<{
    state?: string;
    search?: string;
    page?: string;
    dateField?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

async function QueueDetailContent({ params, searchParams }: QueueDetailPageProps) {
  const { queueName } = await params;
  const filters = await searchParams;
  const decodedQueueName = decodeURIComponent(queueName);

  const session = await getSession();

  // Redirect to settings if no connection
  if (!session) {
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

  // Parse date filters from URL
  const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
  const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

  // Fetch data in parallel
  const [queues, queueStats, metricsData] = await Promise.all([
    getQueuesData(),
    getQueueStatsData(decodedQueueName, startDate, endDate),
    getMetricsData({
      queueName: decodedQueueName,
      startDate,
      endDate,
    }),
  ]);

  // Check if queue exists
  if (!queueStats) {
    notFound();
  }

  const { metrics: speedMetrics, timeSeries } = metricsData;

  // Calculate derived metrics using domain functions
  const pendingJobs = queueStats.created + queueStats.retry;
  const throughputPerMinute = calculateThroughputFromTimeSeries(timeSeries);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/queues">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <QueueSelector currentQueue={decodedQueueName} queues={queues} />
        </div>
        <JobsFilterWrapper />
      </div>

      <QueueHealthCardWrapper
        queueName={decodedQueueName}
        startDate={startDate}
        endDate={endDate}
      />

      <SpeedMetricsCards
        metrics={speedMetrics}
        pendingJobs={pendingJobs}
        throughputPerMinute={throughputPerMinute}
      />

      <JobsTableWrapper queueName={decodedQueueName} />
    </div>
  );
}

export default async function QueueDetailPage(props: QueueDetailPageProps) {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <QueueDetailContent {...props} />
    </Suspense>
  );
}
