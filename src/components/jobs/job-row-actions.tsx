"use client";

import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, RefreshCw, XCircle, Eye } from "lucide-react";
import { retryJob, cancelJob } from "@/lib/actions/jobs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/db/types";

interface JobRowActionsProps {
  job: Job;
  onViewDetails: () => void;
}

export function JobRowActions({ job, onViewDetails }: JobRowActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRetry = () => {
    startTransition(async () => {
      const result = await retryJob(job.id);
      if (result.success) {
        toast.success("Job queued for retry");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to retry job");
      }
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelJob(job.id);
      if (result.success) {
        toast.success("Job cancelled");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to cancel job");
      }
    });
  };

  const canRetry = ["failed", "cancelled"].includes(job.state);
  const canCancel = ["created", "retry"].includes(job.state);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onViewDetails}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        {canRetry && (
          <DropdownMenuItem onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </DropdownMenuItem>
        )}
        {canCancel && (
          <DropdownMenuItem className="text-destructive" onClick={handleCancel}>
            <XCircle className="mr-2 h-4 w-4" />
            Cancel
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
