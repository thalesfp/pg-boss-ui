"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, ExternalLink } from "lucide-react";
import { useQueues } from "@/lib/hooks/use-queues";
import { purgeQueue as purgeQueueAction } from "@/lib/actions/queues";
import { toast } from "sonner";
import type { JobState } from "@/lib/db/types";

export function QueueList() {
  const { queues, isLoading } = useQueues();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handlePurge = (queueName: string, state?: JobState) => {
    startTransition(async () => {
      const result = await purgeQueueAction(queueName, state);
      if (result.success) {
        toast.success(`${result.deleted || 0} jobs purged from ${queueName}`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to purge queue");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-12 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (queues.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        No queues found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Queue</TableHead>
          <TableHead className="text-center">Pending</TableHead>
          <TableHead className="text-center">Active</TableHead>
          <TableHead className="text-center">Completed</TableHead>
          <TableHead className="text-center">Failed</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {queues.map((queue) => (
          <TableRow key={queue.name}>
            <TableCell>
              <Link
                href={`/queues/${encodeURIComponent(queue.name)}`}
                className="flex items-center gap-2 font-medium hover:underline"
              >
                {queue.name}
                <ExternalLink className="h-3 w-3" />
              </Link>
              {queue.policy && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {queue.policy}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="secondary">
                {(queue.stats?.created || 0) + (queue.stats?.retry || 0)}
              </Badge>
            </TableCell>
            <TableCell className="text-center">
              <Badge
                variant={queue.stats?.active ? "default" : "secondary"}
                className={queue.stats?.active ? "bg-blue-500" : ""}
              >
                {queue.stats?.active || 0}
              </Badge>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                {queue.stats?.completed || 0}
              </Badge>
            </TableCell>
            <TableCell className="text-center">
              <Badge
                variant={queue.stats?.failed ? "destructive" : "secondary"}
              >
                {queue.stats?.failed || 0}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handlePurge(queue.name, "completed")}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Purge Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handlePurge(queue.name, "failed")}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Purge Failed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handlePurge(queue.name)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Purge All
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
