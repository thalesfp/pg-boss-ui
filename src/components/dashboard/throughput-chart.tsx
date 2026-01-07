"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import type { ThroughputDataPoint } from "@/lib/db/types";
import { getTimeRangeLabel } from "@/lib/utils";

interface ThroughputChartProps {
  data?: ThroughputDataPoint[];
  isLoading?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
}

export function ThroughputChart({ data, isLoading, startDate, endDate }: ThroughputChartProps) {
  const { theme } = useTheme();
  const tickColor = theme === "dark" ? "hsl(0, 0%, 70.8%)" : "hsl(0, 0%, 55.6%)";
  const timeRangeLabel = getTimeRangeLabel(startDate, endDate);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Throughput ({timeRangeLabel})</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = (data || []).map((point) => ({
    ...point,
    time: format(new Date(point.time), "HH:mm"),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Throughput ({timeRangeLabel})</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                className="text-xs"
                tick={{ fill: tickColor }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: tickColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                dot={false}
                name="Completed"
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                dot={false}
                name="Failed"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
