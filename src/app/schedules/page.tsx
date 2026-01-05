"use client";

import { useState, useEffect } from "react";
import { useDatabaseStore } from "@/lib/stores/database-store";
import { useSchedules } from "@/lib/hooks/use-schedules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, Settings, Clock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function SchedulesPage() {
  const [mounted, setMounted] = useState(false);
  const { getSelectedConnection } = useDatabaseStore();
  const connection = getSelectedConnection();
  const { schedules, isLoading, error } = useSchedules();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render loading state until client-side hydration is complete
  // This prevents hydration mismatch between server (no localStorage) and client
  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
              Configure a database connection to view schedules.
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

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Schedules</h1>
        <p className="text-muted-foreground">
          View scheduled and recurring jobs
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-center text-muted-foreground">
              No schedules found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Cron</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule) => (
              <TableRow key={schedule.name}>
                <TableCell className="font-medium">{schedule.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {schedule.cron}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {schedule.timezone || "UTC"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(schedule.createdOn), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {schedule.updatedOn
                    ? format(new Date(schedule.updatedOn), "MMM d, yyyy HH:mm")
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
