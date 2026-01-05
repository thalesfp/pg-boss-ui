"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  CheckCircle2,
  XCircle,
  ListTodo,
  Clock,
} from "lucide-react";
import type { DashboardStats } from "@/lib/db/types";

interface StatsCardsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Jobs",
      value: stats?.totalJobs ?? 0,
      icon: ListTodo,
      description: "All jobs in the system",
    },
    {
      title: "Created",
      value: stats?.createdJobs ?? 0,
      icon: Clock,
      description: "Queued for processing",
      className: "text-yellow-500",
    },
    {
      title: "Active",
      value: stats?.activeJobs ?? 0,
      icon: Activity,
      description: "Currently processing",
      className: "text-blue-500",
    },
    {
      title: "Completed",
      value: stats?.completedInRange ?? 0,
      icon: CheckCircle2,
      description: "In selected range",
      className: "text-green-500",
    },
    {
      title: "Failed",
      value: stats?.failedInRange ?? 0,
      icon: XCircle,
      description: "In selected range",
      className: "text-red-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {cards.map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.className || "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {card.value.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
