"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QueueSelectorProps {
  currentQueue: string;
  queues: Array<{ name: string }>;
}

export function QueueSelector({ currentQueue, queues }: QueueSelectorProps) {
  const router = useRouter();

  return (
    <div>
      <Select
        value={currentQueue}
        onValueChange={(v) => router.push(`/queues/${encodeURIComponent(v)}`)}
      >
        <SelectTrigger className="w-auto text-2xl font-bold h-auto border-none shadow-none p-0 focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {queues.map((q) => (
            <SelectItem key={q.name} value={q.name}>
              {q.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground">View and manage jobs in this queue</p>
    </div>
  );
}
