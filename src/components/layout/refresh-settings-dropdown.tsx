"use client";

import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  usePreferencesStore,
  type RefreshCategory,
} from "@/lib/stores/preferences-store";

const INTERVAL_OPTIONS = [
  { value: 1000, label: "1s" },
  { value: 2000, label: "2s" },
  { value: 5000, label: "5s" },
  { value: 10000, label: "10s" },
  { value: 30000, label: "30s" },
  { value: 60000, label: "60s" },
  { value: 0, label: "Off" },
];

const CATEGORIES: { key: RefreshCategory; label: string }[] = [
  { key: "stats", label: "Stats & Queues" },
  { key: "jobs", label: "Jobs" },
  { key: "metrics", label: "Metrics & Schedules" },
];

function formatInterval(ms: number): string {
  if (ms === 0) return "Off";
  if (ms >= 60000) return `${ms / 60000}m`;
  return `${ms / 1000}s`;
}

export function RefreshSettingsDropdown() {
  const { refreshIntervals, setRefreshInterval } = usePreferencesStore();

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Timer className="h-5 w-5" />
                <span className="sr-only">Refresh settings</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh intervals</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Refresh Intervals</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CATEGORIES.map((category) => (
          <DropdownMenuSub key={category.key}>
            <DropdownMenuSubTrigger>
              <span className="flex-1">{category.label}</span>
              <span className="text-muted-foreground text-xs">
                {formatInterval(refreshIntervals[category.key])}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={String(refreshIntervals[category.key])}
                onValueChange={(value) =>
                  setRefreshInterval(category.key, parseInt(value, 10))
                }
              >
                {INTERVAL_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={String(option.value)}
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
