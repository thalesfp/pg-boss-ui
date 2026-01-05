"use client";

import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamic import with no SSR - prevents hydration mismatch
const QueueHealthCard = dynamic(
  () => import("@/components/queues/queue-health-card").then((mod) => ({
    default: mod.QueueHealthCard
  })),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Queue Health</CardTitle>
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
    )
  }
);

interface QueueHealthCardWrapperProps {
  queueName: string;
  startDate?: Date;
  endDate?: Date;
}

export function QueueHealthCardWrapper(props: QueueHealthCardWrapperProps) {
  return <QueueHealthCard {...props} />;
}
