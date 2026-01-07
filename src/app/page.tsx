import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getDashboardData } from "@/lib/data/stats";
import { getMetricsData } from "@/lib/data/metrics";
import { calculatePendingJobs, calculateThroughputPerMinute } from "@/lib/domain/metrics";
import { validateDate } from "@/lib/db/validation";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ThroughputChart } from "@/components/dashboard/throughput-chart";
import { QueueHealth } from "@/components/dashboard/queue-health";
import { SpeedMetricsCards } from "@/components/metrics/speed-metrics-cards";
import { SpeedMetricsChart } from "@/components/metrics/speed-metrics-chart";
import { DateFilterWrapper } from "@/components/client/date-filter-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Settings } from "lucide-react";
import Link from "next/link";

interface DashboardPageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    range?: string;
  }>;
}

async function DashboardContent({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
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
              Configure a database connection to start monitoring your pg-boss
              queues.
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
  const isAllTime = params.range === "all";
  const startDate = !isAllTime ? validateDate(params.startDate || null) : undefined;
  const endDate = !isAllTime ? validateDate(params.endDate || null) : undefined;

  // Fetch data in parallel
  const [dashboardData, metricsData] = await Promise.all([
    getDashboardData(startDate, endDate),
    getMetricsData({ startDate, endDate }),
  ]);

  const { stats, throughput } = dashboardData;
  const { metrics: speedMetrics, timeSeries: speedTimeSeries } = metricsData;

  // Calculate derived metrics using domain functions
  const pendingJobs = calculatePendingJobs(stats.queues);
  const throughputPerMinute = calculateThroughputPerMinute(throughput);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your pg-boss job queues
          </p>
        </div>
        <DateFilterWrapper />
      </div>

      <StatsCards stats={stats} />

      <SpeedMetricsCards
        metrics={speedMetrics}
        pendingJobs={pendingJobs}
        throughputPerMinute={throughputPerMinute}
        startDate={startDate}
        endDate={endDate}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ThroughputChart data={throughput} startDate={startDate} endDate={endDate} />
        <SpeedMetricsChart data={speedTimeSeries} />
      </div>

      <QueueHealth queues={stats.queues} />
    </div>
  );
}

export default async function DashboardPage(props: DashboardPageProps) {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <DashboardContent {...props} />
    </Suspense>
  );
}
