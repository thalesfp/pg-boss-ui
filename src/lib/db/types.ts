export type JobState =
  | "created"
  | "retry"
  | "active"
  | "completed"
  | "cancelled"
  | "failed";

export type DateField = "created_on" | "completed_on";

export interface DateRangeFilter {
  dateField: DateField;
  startDate?: Date;
  endDate?: Date;
}

export interface Job {
  id: string;
  name: string;
  priority: number;
  data: Record<string, unknown> | null;
  state: JobState;
  retryLimit: number;
  retryCount: number;
  retryDelay: number;
  retryBackoff: boolean;
  startAfter: Date;
  startedOn: Date | null;
  singletonKey: string | null;
  singletonOn: Date | null;
  expireIn: string;
  createdOn: Date;
  completedOn: Date | null;
  keepUntil: Date | null;
  output: Record<string, unknown> | null;
  deadLetter: string | null;
  policy: string | null;
}

export interface Queue {
  name: string;
  policy: string | null;
  retryLimit: number | null;
  retryDelay: number | null;
  retryBackoff: boolean | null;
  expireIn: string | null;
  retentionDays: number | null;
  deadLetter: string | null;
  createdOn: Date;
  updatedOn: Date | null;
}

export interface QueueStats {
  name: string;
  created: number;
  retry: number;
  active: number;
  completed: number;
  cancelled: number;
  failed: number;
}

export interface Schedule {
  name: string;
  cron: string;
  timezone: string | null;
  data: Record<string, unknown> | null;
  options: Record<string, unknown> | null;
  createdOn: Date;
  updatedOn: Date | null;
}

export interface DashboardStats {
  totalJobs: number;
  createdJobs: number;
  activeJobs: number;
  completedInRange: number;
  failedInRange: number;
  queues: QueueStats[];
}

export interface ThroughputDataPoint {
  time: string;
  completed: number;
  failed: number;
}

export interface PercentileMetrics {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

export interface SpeedMetrics {
  processingTime: PercentileMetrics;
  waitTime: PercentileMetrics;
  endToEndLatency: PercentileMetrics;
}

export interface QueueSpeedMetrics extends SpeedMetrics {
  queueName: string;
}

export interface SpeedMetricsOverTime {
  time: string;
  processingTimeP50: number;
  processingTimeP95: number;
  waitTimeP50: number;
  waitTimeP95: number;
  count: number;
}
