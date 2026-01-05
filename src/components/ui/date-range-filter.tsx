"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, subHours, subDays } from "date-fns";
import { cn } from "@/lib/utils";

export interface DateRangeValue {
  startDate?: Date;
  endDate?: Date;
}

type PresetRange = "1h" | "24h" | "7d" | "30d" | "all" | "custom";

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

const PRESET_RANGES: { value: PresetRange; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
  { value: "custom", label: "Custom" },
];

function getPresetDates(preset: PresetRange): { start?: Date; end?: Date } {
  const now = new Date();
  switch (preset) {
    case "1h":
      return { start: subHours(now, 1), end: now };
    case "24h":
      return { start: subHours(now, 24), end: now };
    case "7d":
      return { start: subDays(now, 7), end: now };
    case "30d":
      return { start: subDays(now, 30), end: now };
    case "all":
      return { start: undefined, end: undefined };
    case "custom":
      return { start: undefined, end: undefined };
  }
}

function detectPreset(startDate?: Date, endDate?: Date): PresetRange {
  if (!startDate && !endDate) return "all";
  if (!startDate || !endDate) return "custom";

  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (Math.abs(diffHours - 1) < 0.1) return "1h";
  if (Math.abs(diffHours - 24) < 0.5) return "24h";
  if (Math.abs(diffHours - 24 * 7) < 1) return "7d";
  if (Math.abs(diffHours - 24 * 30) < 1) return "30d";

  return "custom";
}

export function DateRangeFilter({
  value,
  onChange,
  className,
}: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetRange>(() =>
    detectPreset(value.startDate, value.endDate)
  );
  const [customOpen, setCustomOpen] = useState(false);

  // Sync activePreset when value prop changes externally
  useEffect(() => {
    setActivePreset(detectPreset(value.startDate, value.endDate));
  }, [value.startDate, value.endDate]);

  const handlePresetChange = (preset: PresetRange) => {
    setActivePreset(preset);
    if (preset === "custom") {
      setCustomOpen(true);
      return;
    }
    const { start, end } = getPresetDates(preset);
    onChange({ startDate: start, endDate: end });
  };

  const handleCustomDateChange = (start?: Date, end?: Date) => {
    onChange({ startDate: start, endDate: end });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center rounded-md border">
        {PRESET_RANGES.map((preset) => (
          <Button
            key={preset.value}
            variant="ghost"
            size="sm"
            onClick={() => handlePresetChange(preset.value)}
            className={cn(
              "rounded-none px-3 h-9",
              activePreset === preset.value &&
                "bg-muted font-medium"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {activePreset === "custom" && (
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {value.startDate && value.endDate ? (
                <span>
                  {format(value.startDate, "MMM d")} -{" "}
                  {format(value.endDate, "MMM d")}
                </span>
              ) : (
                <span>Pick dates</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              <div className="border-r p-2">
                <p className="text-xs text-muted-foreground mb-2 px-2">Start</p>
                <Calendar
                  mode="single"
                  selected={value.startDate}
                  onSelect={(date) =>
                    handleCustomDateChange(date, value.endDate)
                  }
                  initialFocus
                />
              </div>
              <div className="p-2">
                <p className="text-xs text-muted-foreground mb-2 px-2">End</p>
                <Calendar
                  mode="single"
                  selected={value.endDate}
                  onSelect={(date) =>
                    handleCustomDateChange(value.startDate, date)
                  }
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
