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
import type { SpeedMetricsOverTime } from "@/lib/db/types";
import { formatDuration } from "@/lib/utils";

interface SpeedMetricsChartProps {
  data?: SpeedMetricsOverTime[];
  isLoading?: boolean;
  title?: string;
}

export function SpeedMetricsChart({
  data,
  isLoading,
  title = "Speed Metrics Over Time",
}: SpeedMetricsChartProps) {
  const { theme } = useTheme();
  const tickColor = theme === "dark" ? "hsl(0, 0%, 70.8%)" : "hsl(0, 0%, 55.6%)";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div
        className="rounded-md border p-2 shadow-sm"
        style={{
          backgroundColor: "hsl(var(--popover))",
          borderColor: "hsl(var(--border))",
        }}
      >
        <p
          className="text-sm font-medium mb-1"
          style={{ color: "hsl(var(--popover-foreground))" }}
        >
          {label}
        </p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="text-xs"
            style={{ color: entry.color }}
          >
            {entry.name}: {formatDuration(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
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
                tickFormatter={(value) => formatDuration(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="processingTimeP50"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                dot={false}
                name="Processing p50"
              />
              <Line
                type="monotone"
                dataKey="processingTimeP95"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Processing p95"
              />
              <Line
                type="monotone"
                dataKey="waitTimeP50"
                stroke="hsl(38, 92%, 50%)"
                strokeWidth={2}
                dot={false}
                name="Wait p50"
              />
              <Line
                type="monotone"
                dataKey="waitTimeP95"
                stroke="hsl(38, 92%, 50%)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Wait p95"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
