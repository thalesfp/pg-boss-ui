import type { QueueStats } from "@/lib/db/types";

export type HealthStatus = "healthy" | "warning" | "critical";

export interface HealthThresholds {
  warning: { failed: number; pending: number };
  critical: { failed: number; pending: number };
}

export interface HealthResult {
  status: HealthStatus;
  label: string;
  reason: string;
}

/**
 * Calculate the health status of a queue based on failed and pending jobs
 * @param queue - Queue statistics
 * @param thresholds - Health thresholds configuration
 * @returns Health result with status, label, and reason
 */
export function calculateQueueHealth(
  queue: QueueStats,
  thresholds: HealthThresholds
): HealthResult {
  const pending = queue.created + queue.retry;
  const failed = queue.failed;

  const status = getStatus(pending, failed, thresholds);
  const label = getLabel(status);
  const reason = getReason(pending, failed, status, thresholds);

  return { status, label, reason };
}

function getStatus(
  pending: number,
  failed: number,
  thresholds: HealthThresholds
): HealthStatus {
  if (failed > thresholds.critical.failed || pending > thresholds.critical.pending) {
    return "critical";
  }
  if (failed > thresholds.warning.failed || pending > thresholds.warning.pending) {
    return "warning";
  }
  return "healthy";
}

function getLabel(status: HealthStatus): string {
  const labels: Record<HealthStatus, string> = {
    healthy: "Healthy",
    warning: "Warning",
    critical: "Critical",
  };
  return labels[status];
}

function getReason(
  pending: number,
  failed: number,
  status: HealthStatus,
  thresholds: HealthThresholds
): string {
  if (status === "healthy") {
    return "All metrics within normal thresholds";
  }

  const threshold = status === "critical" ? thresholds.critical : thresholds.warning;
  const reasons: string[] = [];

  if (failed > threshold.failed) {
    reasons.push(`${failed} failed jobs (threshold: ${threshold.failed})`);
  }
  if (pending > threshold.pending) {
    reasons.push(`${pending} pending jobs (threshold: ${threshold.pending})`);
  }

  return reasons.join(" and ");
}
