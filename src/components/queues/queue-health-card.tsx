"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useStats } from "@/lib/hooks/use-stats";
import { usePreferencesStore } from "@/lib/stores/preferences-store";
import { calculateQueueHealth } from "@/lib/domain/health";
import { calculateTotalJobs, calculateFailureRate } from "@/lib/domain/metrics";
import type { QueueStats } from "@/lib/db/types";

interface QueueHealthCardProps {
  queueName: string;
  startDate?: Date;
  endDate?: Date;
}

function HealthBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    healthy: "bg-green-500/10 text-green-600",
    warning: "bg-yellow-500/10 text-yellow-600",
    critical: "bg-red-500/10 text-red-600",
  };

  return (
    <Badge variant="secondary" className={styles[status] || styles.healthy}>
      {label}
    </Badge>
  );
}

function StatItem({ label, value, variant }: { label: string; value: number; variant?: "default" | "warning" | "danger" }) {
  const valueStyles: Record<string, string> = {
    default: "text-foreground",
    warning: "text-yellow-600",
    danger: "text-red-600",
  };

  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${valueStyles[variant || "default"]}`}>
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function QueueHealthCard({ queueName, startDate, endDate }: QueueHealthCardProps) {
  const { stats, isLoading } = useStats({
    startDate,
    endDate,
  });
  const { healthThresholds } = usePreferencesStore();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Queue Health</CardTitle>
          <Skeleton className="h-5 w-16" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="mx-auto h-8 w-12 mb-1" />
                <Skeleton className="mx-auto h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const queueStats = stats?.queues?.find((q) => q.name === queueName);

  if (!queueStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Queue Health</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No statistics available for this queue</p>
        </CardContent>
      </Card>
    );
  }

  const health = calculateQueueHealth(queueStats, healthThresholds);
  const totalJobs = calculateTotalJobs(queueStats);
  const failureRate = calculateFailureRate(queueStats.completed, queueStats.failed);

  const healthStyles: Record<string, string> = {
    healthy: "bg-green-500/10 border-green-500/20",
    warning: "bg-yellow-500/10 border-yellow-500/20",
    critical: "bg-red-500/10 border-red-500/20",
  };

  const healthTextStyles: Record<string, string> = {
    healthy: "text-green-600",
    warning: "text-yellow-600",
    critical: "text-red-600",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {/* Health Status Box */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex flex-col items-center justify-center rounded-lg border px-8 py-4 cursor-help ${healthStyles[health.status]}`}>
                <span className={`text-2xl font-bold ${healthTextStyles[health.status]}`}>
                  {health.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {totalJobs.toLocaleString()} total jobs
                </span>
                <span className={`text-sm ${healthTextStyles[health.status]}`}>
                  {failureRate.toFixed(1)}% failure rate
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {health.reason}
            </TooltipContent>
          </Tooltip>

          {/* Stats Grid */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <StatItem label="Created" value={queueStats.created} />
            <StatItem label="Retry" value={queueStats.retry} variant={queueStats.retry > 0 ? "warning" : "default"} />
            <StatItem label="Active" value={queueStats.active} />
            <StatItem label="Completed" value={queueStats.completed} />
            <StatItem label="Failed" value={queueStats.failed} variant={queueStats.failed > 0 ? "danger" : "default"} />
            <StatItem label="Cancelled" value={queueStats.cancelled} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
