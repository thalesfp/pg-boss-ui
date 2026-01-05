import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function formatEstimate(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "N/A";
  if (minutes < 1) return "< 1m";
  if (minutes < 60) return `~${Math.round(minutes)}m`;
  if (minutes < 1440) return `~${(minutes / 60).toFixed(1)}h`;
  return `~${(minutes / 1440).toFixed(1)}d`;
}
