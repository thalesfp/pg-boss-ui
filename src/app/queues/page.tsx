"use client";

import { useState, useEffect } from "react";
import { QueueList } from "@/components/queues/queue-list";
import { useDatabaseStore } from "@/lib/stores/database-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Settings } from "lucide-react";
import Link from "next/link";

export default function QueuesPage() {
  const [mounted, setMounted] = useState(false);
  const { getSelectedConnection } = useDatabaseStore();
  const connection = getSelectedConnection();

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
              Configure a database connection to view queues.
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
      <div>
        <h1 className="text-3xl font-bold">Queues</h1>
        <p className="text-muted-foreground">
          Manage and monitor your job queues
        </p>
      </div>

      <QueueList />
    </div>
  );
}
