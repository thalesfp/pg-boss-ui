"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreVertical,
  RefreshCw,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { useJobs } from "@/lib/hooks/use-jobs";
import { retryJob, cancelJob, retryAllJobs, cancelAllJobs } from "@/lib/actions/jobs";
import { purgeQueue } from "@/lib/actions/queues";
import { JobDetailDialog } from "./job-detail-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Job, JobState } from "@/lib/db/types";
import type { JobsFilters, SortField, SortOrder } from "@/lib/hooks/use-url-filters";

interface JobsTableProps {
  queueName: string;
  filters: JobsFilters;
  onFiltersChange: (updates: Partial<JobsFilters>) => void;
}

const JOB_STATES: { value: JobState | "all"; label: string }[] = [
  { value: "all", label: "All States" },
  { value: "created", label: "Created" },
  { value: "retry", label: "Retry" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
];

function StateBadge({ state }: { state: JobState }) {
  const variants: Record<JobState, string> = {
    created: "bg-blue-500/10 text-blue-600",
    retry: "bg-yellow-500/10 text-yellow-600",
    active: "bg-purple-500/10 text-purple-600",
    completed: "bg-green-500/10 text-green-600",
    cancelled: "bg-gray-500/10 text-gray-600",
    failed: "bg-red-500/10 text-red-600",
  };

  return (
    <Badge variant="secondary" className={variants[state]}>
      {state}
    </Badge>
  );
}

type ConfirmActionType = "retryAll" | "cancelAll" | "purgeCompleted" | "purgeFailed";

const ACTION_DESCRIPTIONS: Record<ConfirmActionType, string> = {
  retryAll: "This will retry all failed jobs in this queue.",
  cancelAll: "This will cancel all pending jobs in this queue.",
  purgeCompleted:
    "This will permanently delete all completed jobs from this queue.",
  purgeFailed:
    "This will permanently delete all failed jobs from this queue.",
};

export function JobsTable({
  queueName,
  filters,
  onFiltersChange,
}: JobsTableProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: ConfirmActionType | null;
    input: string;
  }>({ type: null, input: "" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pageSize = 20;

  const {
    jobs,
    total,
    isLoading,
    refresh,
  } = useJobs({
    queueName,
    state: filters.state === "all" ? undefined : filters.state,
    search: filters.search || undefined,
    limit: pageSize,
    offset: filters.page * pageSize,
    dateField: filters.dateField,
    startDate: filters.startDate,
    endDate: filters.endDate,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  const handleSort = (field: SortField) => {
    if (filters.sortBy === field) {
      // Toggle order if same field
      onFiltersChange({ sortOrder: filters.sortOrder === "asc" ? "desc" : "asc", page: 0 });
    } else {
      // New field, default to descending
      onFiltersChange({ sortBy: field, sortOrder: "desc", page: 0 });
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (filters.sortBy !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return filters.sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const handleRetry = (jobId: string) => {
    startTransition(async () => {
      const result = await retryJob(jobId);
      if (result.success) {
        toast.success("Job queued for retry");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to retry job");
      }
    });
  };

  const handleCancel = (jobId: string) => {
    startTransition(async () => {
      const result = await cancelJob(jobId);
      if (result.success) {
        toast.success("Job cancelled");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to cancel job");
      }
    });
  };

  const handleRetryAll = () => {
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

  const handleCancelAll = () => {
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

  const handlePurgeCompleted = () => {
    startTransition(async () => {
      const result = await purgeQueue(queueName, "completed");
      if (result.success) {
        toast.success(`${result.deleted || 0} completed jobs purged`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to purge queue");
      }
    });
  };

  const handlePurgeFailed = () => {
    startTransition(async () => {
      const result = await purgeQueue(queueName, "failed");
      if (result.success) {
        toast.success(`${result.deleted || 0} failed jobs purged`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to purge queue");
      }
    });
  };

  const handleConfirmAction = async () => {
    if (confirmAction.input !== "confirm") return;

    switch (confirmAction.type) {
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
    setConfirmAction({ type: null, input: "" });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by job ID..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ search: e.target.value, page: 0 })
            }
            className="pl-9"
          />
        </div>
        <Select
          value={filters.state}
          onValueChange={(v) =>
            onFiltersChange({ state: v as JobState | "all", page: 0 })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by state" />
          </SelectTrigger>
          <SelectContent>
            {JOB_STATES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refresh()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setConfirmAction({ type: "retryAll", input: "" })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry All Failed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmAction({ type: "cancelAll", input: "" })}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel All Pending
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setConfirmAction({ type: "purgeCompleted", input: "" })
              }
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Purge Completed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setConfirmAction({ type: "purgeFailed", input: "" })
              }
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Purge Failed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          No jobs found
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button onClick={() => handleSort("id")} className="flex items-center hover:text-foreground">
                  Job ID <SortIcon field="id" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort("state")} className="flex items-center hover:text-foreground">
                  State <SortIcon field="state" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort("priority")} className="flex items-center hover:text-foreground">
                  Priority <SortIcon field="priority" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort("created_on")} className="flex items-center hover:text-foreground">
                  Created <SortIcon field="created_on" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort("completed_on")} className="flex items-center hover:text-foreground">
                  Completed <SortIcon field="completed_on" />
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-mono text-xs">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="hover:underline text-left cursor-pointer"
                  >
                    {job.id}
                  </button>
                </TableCell>
                <TableCell>
                  <StateBadge state={job.state} />
                </TableCell>
                <TableCell>{job.priority}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(job.createdOn), "MMM d, HH:mm:ss")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {job.completedOn
                    ? format(new Date(job.completedOn), "MMM d, HH:mm:ss")
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedJob(job)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {["failed", "cancelled"].includes(job.state) && (
                        <DropdownMenuItem onClick={() => handleRetry(job.id)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </DropdownMenuItem>
                      )}
                      {["created", "retry"].includes(job.state) && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleCancel(job.id)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filters.page * pageSize + 1} to{" "}
            {Math.min((filters.page + 1) * pageSize, total)} of {total} jobs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                onFiltersChange({ page: Math.max(0, filters.page - 1) })
              }
              disabled={filters.page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {filters.page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                onFiltersChange({
                  page: Math.min(totalPages - 1, filters.page + 1),
                })
              }
              disabled={filters.page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Job Detail Dialog */}
      <JobDetailDialog
        job={selectedJob}
        open={!!selectedJob}
        onOpenChange={(open) => !open && setSelectedJob(null)}
      />

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmAction.type !== null}
        onOpenChange={(open) =>
          !open && setConfirmAction({ type: null, input: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {confirmAction.type && ACTION_DESCRIPTIONS[confirmAction.type]}{" "}
              Type <span className="font-mono font-semibold">confirm</span> to
              proceed.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Type confirm"
            value={confirmAction.input}
            onChange={(e) =>
              setConfirmAction({ ...confirmAction, input: e.target.value })
            }
            onKeyDown={(e) => e.key === "Enter" && handleConfirmAction()}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction({ type: null, input: "" })}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmAction.type === "purgeCompleted"
                  ? "destructive"
                  : "default"
              }
              disabled={confirmAction.input !== "confirm"}
              onClick={handleConfirmAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
