"use client";

import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw, XCircle, Trash2 } from "lucide-react";
import { ConfirmDialog, type ConfirmActionType } from "./confirm-dialog";
import { retryAllJobs, cancelAllJobs } from "@/lib/actions/jobs";
import { purgeQueue } from "@/lib/actions/queues";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BulkActionsMenuProps {
  queueName: string;
}

export function BulkActionsMenu({ queueName }: BulkActionsMenuProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRetryAll = async () => {
    startTransition(async () => {
      const result = await retryAllJobs(queueName);
      if (result.success) {
        toast.success(`${result.count || 0} jobs queued for retry`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to retry jobs");
      }
    });
  };

  const handleCancelAll = async () => {
    startTransition(async () => {
      const result = await cancelAllJobs(queueName);
      if (result.success) {
        toast.success(`${result.count || 0} jobs cancelled`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to cancel jobs");
      }
    });
  };

  const handlePurgeCompleted = async () => {
    startTransition(async () => {
      const result = await purgeQueue(queueName, "completed");
      if (result.success) {
        toast.success(`${result.deleted || 0} completed jobs deleted`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to purge queue");
      }
    });
  };

  const handlePurgeFailed = async () => {
    startTransition(async () => {
      const result = await purgeQueue(queueName, "failed");
      if (result.success) {
        toast.success(`${result.deleted || 0} failed jobs deleted`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to purge queue");
      }
    });
  };

  const handleConfirm = async () => {
    switch (confirmAction) {
      case "retryAll":
        await handleRetryAll();
        break;
      case "cancelAll":
        await handleCancelAll();
        break;
      case "purgeCompleted":
        await handlePurgeCompleted();
        break;
      case "purgeFailed":
        await handlePurgeFailed();
        break;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={isPending}>
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setConfirmAction("retryAll")}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry All Failed
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmAction("cancelAll")}>
            <XCircle className="mr-2 h-4 w-4" />
            Cancel All Pending
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmAction("purgeCompleted")}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Purge Completed
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setConfirmAction("purgeFailed")}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Purge Failed
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmAction !== null}
        actionType={confirmAction}
        queueName={queueName}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}
