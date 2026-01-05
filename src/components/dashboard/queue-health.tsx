"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { usePreferencesStore } from "@/lib/stores/preferences-store";
import { calculateQueueHealth } from "@/lib/domain/health";
import type { QueueStats } from "@/lib/db/types";

interface QueueHealthProps {
  queues?: QueueStats[];
  isLoading?: boolean;
}

function HealthBadge({ status, label }: { status: string; label: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    healthy: "default",
    warning: "secondary",
    critical: "destructive",
  };

  return (
    <Badge variant={variants[status] || "default"} className="text-xs">
      {label}
    </Badge>
  );
}

export function QueueHealth({ queues, isLoading }: QueueHealthProps) {
  const { healthThresholds } = usePreferencesStore();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Queue Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!queues || queues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Queue Health</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No queues found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {queues.map((queue) => {
            const health = calculateQueueHealth(queue, healthThresholds);
            return (
              <Link
                key={queue.name}
                href={`/queues/${encodeURIComponent(queue.name)}`}
                className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
              >
                <div>
                  <p className="font-medium">{queue.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {queue.created + queue.retry + queue.active + queue.completed + queue.cancelled + queue.failed} total,{" "}
                    {queue.created + queue.retry} pending, {queue.active} active,{" "}
                    {queue.failed} failed
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <HealthBadge status={health.status} label={health.label} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {health.reason}
                  </TooltipContent>
                </Tooltip>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
