import type { QueueStats, ThroughputDataPoint, SpeedMetricsOverTime, DashboardStats } from "@/lib/db/types";

/**
 * Calculate total pending jobs across all queues
 * @param queues - Array of queue statistics
 * @returns Total number of pending jobs (created + retry)
 */
export function calculatePendingJobs(queues: QueueStats[]): number {
  return queues.reduce((sum, q) => sum + q.created + q.retry, 0);
}

/**
 * Calculate throughput per minute based on throughput data points
 * @param throughput - Array of throughput data points over time
 * @returns Average jobs completed per minute
 */
export function calculateThroughputPerMinute(throughput: ThroughputDataPoint[]): number {
  if (!throughput || throughput.length === 0) return 0;

  const totalCompleted = throughput.reduce((sum, t) => sum + t.completed, 0);
  const times = throughput.map((t) => new Date(t.time).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const elapsedMinutes = (maxTime - minTime) / 60000 + 1; // +1 to include both endpoints

  return elapsedMinutes > 0 ? totalCompleted / elapsedMinutes : 0;
}

/**
 * Calculate throughput from time-series metrics data
 * @param timeSeries - Array of speed metrics over time
 * @returns Average jobs completed per minute
 */
export function calculateThroughputFromTimeSeries(timeSeries: SpeedMetricsOverTime[]): number {
  if (!timeSeries || timeSeries.length === 0) return 0;

  const totalCompleted = timeSeries.reduce((sum, t) => sum + t.count, 0);
  const times = timeSeries.map((t) => new Date(t.time).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const elapsedMinutes = (maxTime - minTime) / 60000 + 1;

  return elapsedMinutes > 0 ? totalCompleted / elapsedMinutes : 0;
}

/**
 * Calculate failure rate for a queue or overall stats
 * @param completed - Number of completed jobs
 * @param failed - Number of failed jobs
 * @returns Failure rate as a percentage (0-100)
 */
export function calculateFailureRate(completed: number, failed: number): number {
  const totalProcessed = completed + failed;
  return totalProcessed > 0 ? (failed / totalProcessed) * 100 : 0;
}

/**
 * Calculate total jobs across all states
 * @param queue - Queue statistics
 * @returns Total number of jobs in all states
 */
export function calculateTotalJobs(queue: QueueStats): number {
  return queue.created + queue.retry + queue.active + queue.completed + queue.cancelled + queue.failed;
}
