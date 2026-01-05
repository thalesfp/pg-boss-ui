"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import JsonView from "@uiw/react-json-view";
import { darkTheme } from "@uiw/react-json-view/dark";
import { lightTheme } from "@uiw/react-json-view/light";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import type { Job, JobState } from "@/lib/db/types";

interface JobDetailDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function JobDetailDialog({
  job,
  open,
  onOpenChange,
}: JobDetailDialogProps) {
  const { resolvedTheme } = useTheme();

  if (!job) return null;

  const jsonTheme = resolvedTheme === "dark" ? darkTheme : lightTheme;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Job Details
            <StateBadge state={job.state} />
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="output">Output</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                <InfoRow label="ID" value={<code className="text-xs">{job.id}</code>} />
                <Separator />
                <InfoRow label="Queue" value={job.name} />
                <Separator />
                <InfoRow label="State" value={<StateBadge state={job.state} />} />
                <Separator />
                <InfoRow label="Priority" value={job.priority} />
                <Separator />
                <InfoRow
                  label="Retry Count"
                  value={`${job.retryCount} / ${job.retryLimit}`}
                />
                <Separator />
                <InfoRow label="Expire In" value={job.expireIn} />
                <Separator />
                <InfoRow
                  label="Created"
                  value={format(new Date(job.createdOn), "PPpp")}
                />
                <Separator />
                <InfoRow
                  label="Start After"
                  value={format(new Date(job.startAfter), "PPpp")}
                />
                {job.startedOn && (
                  <>
                    <Separator />
                    <InfoRow
                      label="Started"
                      value={format(new Date(job.startedOn), "PPpp")}
                    />
                  </>
                )}
                {job.completedOn && (
                  <>
                    <Separator />
                    <InfoRow
                      label="Completed"
                      value={format(new Date(job.completedOn), "PPpp")}
                    />
                  </>
                )}
                {job.singletonKey && (
                  <>
                    <Separator />
                    <InfoRow
                      label="Singleton Key"
                      value={<code className="text-xs">{job.singletonKey}</code>}
                    />
                  </>
                )}
                {job.deadLetter && (
                  <>
                    <Separator />
                    <InfoRow label="Dead Letter" value={job.deadLetter} />
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="data" className="mt-4">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              {job.data ? (
                <JsonView
                  value={job.data}
                  style={jsonTheme}
                  displayDataTypes={false}
                  displayObjectSize={false}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="output" className="mt-4">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              {job.output ? (
                <JsonView
                  value={job.output}
                  style={jsonTheme}
                  displayDataTypes={false}
                  displayObjectSize={false}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No output</p>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
