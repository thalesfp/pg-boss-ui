"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, Timer, Gauge, TrendingUp } from "lucide-react";
import type { SpeedMetrics, PercentileMetrics } from "@/lib/db/types";
import { formatDuration, formatEstimate, getTimeRangeLabel } from "@/lib/utils";

interface SpeedMetricsCardsProps {
  metrics?: SpeedMetrics;
  isLoading?: boolean;
  pendingJobs?: number;
  throughputPerMinute?: number;
  startDate?: Date | null;
  endDate?: Date | null;
}

function MetricTooltip({ data }: { data: PercentileMetrics }) {
  if (data.count === 0) {
    return <span className="text-muted-foreground">No data</span>;
  }

  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between gap-4">
        <span>Min:</span>
        <span className="font-mono">{formatDuration(data.min)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Avg:</span>
        <span className="font-mono">{formatDuration(data.avg)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>p50:</span>
        <span className="font-mono">{formatDuration(data.p50)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>p95:</span>
        <span className="font-mono">{formatDuration(data.p95)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>p99:</span>
        <span className="font-mono">{formatDuration(data.p99)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Max:</span>
        <span className="font-mono">{formatDuration(data.max)}</span>
      </div>
      <div className="border-t pt-1 mt-1 flex justify-between gap-4">
        <span>Sample:</span>
        <span className="font-mono">{data.count.toLocaleString()}</span>
      </div>
    </div>
  );
}

function EstimateTooltip({
  pendingJobs,
  throughputPerMinute,
  startDate,
  endDate
}: {
  pendingJobs: number;
  throughputPerMinute: number;
  startDate?: Date | null;
  endDate?: Date | null;
}) {
  if (throughputPerMinute <= 0) {
    return <span className="text-muted-foreground">No recent job completions to estimate</span>;
  }

  const jobsPerHour = throughputPerMinute * 60;
  const timeRangeLabel = getTimeRangeLabel(startDate, endDate);

  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between gap-4">
        <span>Pending:</span>
        <span className="font-mono">{pendingJobs.toLocaleString()} jobs</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Rate:</span>
        <span className="font-mono">{throughputPerMinute.toFixed(1)}/min</span>
      </div>
      <div className="flex justify-between gap-4">
        <span></span>
        <span className="font-mono">{jobsPerHour.toFixed(0)}/hour</span>
      </div>
      <div className="border-t pt-1 mt-1 text-muted-foreground">
        Based on {timeRangeLabel}&apos;s throughput
      </div>
    </div>
  );
}

export function SpeedMetricsCards({
  metrics,
  isLoading,
  pendingJobs = 0,
  throughputPerMinute = 0,
  startDate,
  endDate,
}: SpeedMetricsCardsProps) {
  const estimatedMinutes = throughputPerMinute > 0 ? pendingJobs / throughputPerMinute : Infinity;
  const hasEstimateData = throughputPerMinute > 0;

  const cards = [
    {
      title: "Processing Time",
      data: metrics?.processingTime,
      icon: Timer,
      description: "Time to execute job",
      className: "text-blue-500",
    },
    {
      title: "Wait Time",
      data: metrics?.waitTime,
      icon: Clock,
      description: "Time in queue",
      className: "text-amber-500",
    },
    {
      title: "End-to-End",
      data: metrics?.endToEndLatency,
      icon: Gauge,
      description: "Total latency",
      className: "text-purple-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...cards, { title: "Est. Completion" }].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const hasData = card.data && card.data.count > 0;
          return (
            <Tooltip key={card.title}>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {card.title}
                    </CardTitle>
                    <card.icon
                      className={`h-4 w-4 ${card.className || "text-muted-foreground"}`}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {hasData ? (
                        <>
                          <span className="font-mono">
                            {formatDuration(card.data!.p50)}
                          </span>
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            p50
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {hasData ? (
                        <>
                          p95: {formatDuration(card.data!.p95)} | {card.description}
                        </>
                      ) : (
                        card.description
                      )}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="w-48">
                {card.data ? (
                  <MetricTooltip data={card.data} />
                ) : (
                  <span className="text-muted-foreground">No data available</span>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Est. Completion Card */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-help">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Est. Completion
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pendingJobs === 0 ? (
                    <span className="font-mono">0m</span>
                  ) : hasEstimateData ? (
                    <span className="font-mono">{formatEstimate(estimatedMinutes)}</span>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pendingJobs === 0
                    ? "Queue empty"
                    : `${pendingJobs.toLocaleString()} pending jobs`}
                </p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-48">
            <EstimateTooltip
              pendingJobs={pendingJobs}
              throughputPerMinute={throughputPerMinute}
              startDate={startDate}
              endDate={endDate}
            />
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
