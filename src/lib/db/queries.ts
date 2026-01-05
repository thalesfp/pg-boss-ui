import { Pool } from "pg";
import type {
  Job,
  Queue,
  QueueStats,
  Schedule,
  DashboardStats,
  ThroughputDataPoint,
  JobState,
  DateField,
  SpeedMetrics,
  PercentileMetrics,
  SpeedMetricsOverTime,
} from "./types";

function mapJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    name: row.name as string,
    priority: row.priority as number,
    data: row.data as Record<string, unknown> | null,
    state: row.state as JobState,
    retryLimit: row.retry_limit as number,
    retryCount: row.retry_count as number,
    retryDelay: row.retry_delay as number,
    retryBackoff: row.retry_backoff as boolean,
    startAfter: new Date(row.start_after as string),
    startedOn: row.started_on ? new Date(row.started_on as string) : null,
    singletonKey: row.singleton_key as string | null,
    singletonOn: row.singleton_on ? new Date(row.singleton_on as string) : null,
    expireIn: row.expire_in as string,
    createdOn: new Date(row.created_on as string),
    completedOn: row.completed_on ? new Date(row.completed_on as string) : null,
    keepUntil: row.keep_until ? new Date(row.keep_until as string) : null,
    output: row.output as Record<string, unknown> | null,
    deadLetter: row.dead_letter as string | null,
    policy: row.policy as string | null,
  };
}

export async function getQueueStats(
  pool: Pool,
  schema: string = "pgboss",
  options: {
    dateField?: DateField;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<QueueStats[]> {
  const { dateField = "created_on", startDate, endDate } = options;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (startDate) {
    conditions.push(`${dateField} >= $${paramIndex++}`);
    params.push(startDate.toISOString());
  }
  if (endDate) {
    conditions.push(`${dateField} <= $${paramIndex++}`);
    params.push(endDate.toISOString());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(
    `
    SELECT
      name,
      COUNT(*) FILTER (WHERE state::text = 'created') as created,
      COUNT(*) FILTER (WHERE state::text = 'retry') as retry,
      COUNT(*) FILTER (WHERE state::text = 'active') as active,
      COUNT(*) FILTER (WHERE state::text = 'completed') as completed,
      COUNT(*) FILTER (WHERE state::text = 'cancelled') as cancelled,
      COUNT(*) FILTER (WHERE state::text = 'failed') as failed
    FROM ${schema}.job
    ${whereClause}
    GROUP BY name
    ORDER BY name
  `,
    params
  );

  return result.rows.map((row) => ({
    name: row.name,
    created: parseInt(row.created, 10),
    retry: parseInt(row.retry, 10),
    active: parseInt(row.active, 10),
    completed: parseInt(row.completed, 10),
    cancelled: parseInt(row.cancelled, 10),
    failed: parseInt(row.failed, 10),
  }));
}

export async function getDashboardStats(
  pool: Pool,
  schema: string = "pgboss",
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<DashboardStats> {
  const { startDate, endDate } = options;

  // Build date conditions for completed_on (used for completed, failed jobs only)
  const completedOnConditions: string[] = [];
  const completedOnParams: unknown[] = [];
  let completedOnParamIndex = 1;

  if (startDate) {
    completedOnConditions.push(`completed_on >= $${completedOnParamIndex++}`);
    completedOnParams.push(startDate.toISOString());
  }
  if (endDate) {
    completedOnConditions.push(`completed_on <= $${completedOnParamIndex++}`);
    completedOnParams.push(endDate.toISOString());
  }

  const completedOnAndClause = completedOnConditions.length > 0
    ? `AND ${completedOnConditions.join(" AND ")}`
    : "";

  // Consolidated single query that gets all dashboard stats at once
  // This replaces 5 separate COUNT queries with one aggregation query
  const statsResult = await pool.query(
    `
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE state::text = 'created') as created,
      COUNT(*) FILTER (WHERE state::text = 'active') as active,
      COUNT(*) FILTER (WHERE state::text = 'completed' ${completedOnAndClause}) as completed_range,
      COUNT(*) FILTER (WHERE state::text = 'failed' ${completedOnAndClause}) as failed_range
    FROM ${schema}.job
  `,
    completedOnParams
  );

  // Queue stats are NOT date-filtered - they represent live queue health
  const queues = await getQueueStats(pool, schema);

  const stats = statsResult.rows[0];
  return {
    totalJobs: parseInt(stats.total, 10),
    createdJobs: parseInt(stats.created, 10),
    activeJobs: parseInt(stats.active, 10),
    completedInRange: parseInt(stats.completed_range, 10),
    failedInRange: parseInt(stats.failed_range, 10),
    queues,
  };
}

export async function getThroughput(
  pool: Pool,
  schema: string = "pgboss",
  options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): Promise<ThroughputDataPoint[]> {
  const { startDate, endDate, limit = 1440 } = options; // Default: 24h of minute data
  const conditions: string[] = ["state::text IN ('completed', 'failed')"];
  const params: unknown[] = [];
  let paramIndex = 1;

  // undefined dates = all time (no date filter)
  if (startDate) {
    conditions.push(`completed_on >= $${paramIndex++}`);
    params.push(startDate.toISOString());
  }
  if (endDate) {
    conditions.push(`completed_on <= $${paramIndex++}`);
    params.push(endDate.toISOString());
  }

  const result = await pool.query(
    `
    SELECT
      date_trunc('minute', completed_on) as time,
      COUNT(*) FILTER (WHERE state::text = 'completed') as completed,
      COUNT(*) FILTER (WHERE state::text = 'failed') as failed
    FROM ${schema}.job
    WHERE ${conditions.join(" AND ")}
    GROUP BY date_trunc('minute', completed_on)
    ORDER BY time DESC
    LIMIT $${paramIndex}
  `,
    [...params, limit]
  );

  // Reverse to get chronological order (oldest first)
  return result.rows.reverse().map((row) => ({
    time: new Date(row.time).toISOString(),
    completed: parseInt(row.completed, 10),
    failed: parseInt(row.failed, 10),
  }));
}

export async function getQueues(
  pool: Pool,
  schema: string = "pgboss"
): Promise<Queue[]> {
  // Query only essential columns that exist in all pg-boss versions
  const result = await pool.query(`
    SELECT name
    FROM ${schema}.queue
    ORDER BY name
  `);

  return result.rows.map((row) => ({
    name: row.name,
    policy: null,
    retryLimit: null,
    retryDelay: null,
    retryBackoff: null,
    expireIn: null,
    retentionDays: null,
    deadLetter: null,
    createdOn: new Date(),
    updatedOn: null,
  }));
}

export interface QueueWithStats extends Queue {
  stats: QueueStats;
}

export async function getQueuesWithStats(
  pool: Pool,
  schema: string = "pgboss"
): Promise<QueueWithStats[]> {
  // Combined query that fetches queue metadata with job statistics
  // Uses LEFT JOIN to include queues even if they have no jobs
  const result = await pool.query(
    `
    SELECT
      q.name,
      COUNT(j.id) FILTER (WHERE j.state::text = 'created') as created,
      COUNT(j.id) FILTER (WHERE j.state::text = 'retry') as retry,
      COUNT(j.id) FILTER (WHERE j.state::text = 'active') as active,
      COUNT(j.id) FILTER (WHERE j.state::text = 'completed') as completed,
      COUNT(j.id) FILTER (WHERE j.state::text = 'cancelled') as cancelled,
      COUNT(j.id) FILTER (WHERE j.state::text = 'failed') as failed
    FROM ${schema}.queue q
    LEFT JOIN ${schema}.job j ON q.name = j.name
    GROUP BY q.name
    ORDER BY q.name
  `
  );

  const queuesWithStats: QueueWithStats[] = result.rows.map((row) => ({
    name: row.name,
    policy: null,
    retryLimit: null,
    retryDelay: null,
    retryBackoff: null,
    expireIn: null,
    retentionDays: null,
    deadLetter: null,
    createdOn: new Date(),
    updatedOn: null,
    stats: {
      name: row.name,
      created: parseInt(row.created, 10),
      retry: parseInt(row.retry, 10),
      active: parseInt(row.active, 10),
      completed: parseInt(row.completed, 10),
      cancelled: parseInt(row.cancelled, 10),
      failed: parseInt(row.failed, 10),
    },
  }));

  // Also get queues that exist in jobs but not in queue table (orphaned queues)
  const orphanedStatsResult = await pool.query(
    `
    SELECT
      j.name,
      COUNT(*) FILTER (WHERE j.state::text = 'created') as created,
      COUNT(*) FILTER (WHERE j.state::text = 'retry') as retry,
      COUNT(*) FILTER (WHERE j.state::text = 'active') as active,
      COUNT(*) FILTER (WHERE j.state::text = 'completed') as completed,
      COUNT(*) FILTER (WHERE j.state::text = 'cancelled') as cancelled,
      COUNT(*) FILTER (WHERE j.state::text = 'failed') as failed
    FROM ${schema}.job j
    LEFT JOIN ${schema}.queue q ON j.name = q.name
    WHERE q.name IS NULL
    GROUP BY j.name
    ORDER BY j.name
  `
  );

  const orphanedQueues: QueueWithStats[] = orphanedStatsResult.rows.map((row) => ({
    name: row.name,
    policy: null,
    retryLimit: null,
    retryDelay: null,
    retryBackoff: null,
    expireIn: null,
    retentionDays: null,
    deadLetter: null,
    createdOn: new Date(),
    updatedOn: null,
    stats: {
      name: row.name,
      created: parseInt(row.created, 10),
      retry: parseInt(row.retry, 10),
      active: parseInt(row.active, 10),
      completed: parseInt(row.completed, 10),
      cancelled: parseInt(row.cancelled, 10),
      failed: parseInt(row.failed, 10),
    },
  }));

  return [...queuesWithStats, ...orphanedQueues];
}

export async function getJobs(
  pool: Pool,
  schema: string = "pgboss",
  options: {
    queueName?: string;
    state?: JobState;
    limit?: number;
    offset?: number;
    search?: string;
    dateField?: DateField;
    startDate?: Date;
    endDate?: Date;
    sortBy?: "id" | "state" | "priority" | "created_on" | "completed_on";
    sortOrder?: "asc" | "desc";
  } = {}
): Promise<{ jobs: Job[]; total: number }> {
  const {
    queueName,
    state,
    limit = 50,
    offset = 0,
    search,
    dateField = "created_on",
    startDate,
    endDate,
    sortBy = "created_on",
    sortOrder = "desc",
  } = options;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (queueName) {
    conditions.push(`name = $${paramIndex++}`);
    params.push(queueName);
  }

  if (state) {
    conditions.push(`state = $${paramIndex++}`);
    params.push(state);
  }

  if (search) {
    conditions.push(`id::text ILIKE $${paramIndex++}`);
    params.push(`%${search}%`);
  }

  if (startDate) {
    conditions.push(`${dateField} >= $${paramIndex++}`);
    params.push(startDate.toISOString());
  }

  if (endDate) {
    conditions.push(`${dateField} <= $${paramIndex++}`);
    params.push(endDate.toISOString());
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [jobsResult, countResult] = await Promise.all([
    pool.query(
      `
      SELECT *
      FROM ${schema}.job
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex}
    `,
      [...params, limit, offset]
    ),
    pool.query(
      `
      SELECT COUNT(*) as count
      FROM ${schema}.job
      ${whereClause}
    `,
      params
    ),
  ]);

  return {
    jobs: jobsResult.rows.map(mapJob),
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function getJob(
  pool: Pool,
  jobId: string,
  schema: string = "pgboss"
): Promise<Job | null> {
  const result = await pool.query(
    `SELECT * FROM ${schema}.job WHERE id = $1`,
    [jobId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapJob(result.rows[0]);
}

export async function retryJob(
  pool: Pool,
  jobId: string,
  schema: string = "pgboss"
): Promise<string> {
  const result = await pool.query(
    `
    UPDATE ${schema}.job
    SET state = 'created',
        retry_count = 0,
        completed_on = NULL,
        started_on = NULL,
        start_after = NOW(),
        output = NULL
    WHERE id = $1
      AND state::text IN ('failed', 'cancelled')
    RETURNING id
  `,
    [jobId]
  );

  if (result.rows.length === 0) {
    throw new Error("Job not found or not in a retryable state");
  }

  return result.rows[0].id;
}

export async function retryAllJobs(
  pool: Pool,
  queueName: string,
  schema: string = "pgboss"
): Promise<number> {
  const result = await pool.query(
    `
    UPDATE ${schema}.job
    SET state = 'created',
        retry_count = 0,
        completed_on = NULL,
        started_on = NULL,
        start_after = NOW(),
        output = NULL
    WHERE name = $1
      AND state::text IN ('failed', 'cancelled')
  `,
    [queueName]
  );

  return result.rowCount || 0;
}

export async function cancelJob(
  pool: Pool,
  jobId: string,
  schema: string = "pgboss"
): Promise<boolean> {
  const result = await pool.query(
    `
    UPDATE ${schema}.job
    SET state = 'cancelled', completed_on = NOW()
    WHERE id = $1 AND state IN ('created', 'retry')
    RETURNING id
  `,
    [jobId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

export async function cancelAllJobs(
  pool: Pool,
  queueName: string,
  schema: string = "pgboss"
): Promise<number> {
  const result = await pool.query(
    `
    UPDATE ${schema}.job
    SET state = 'cancelled', completed_on = NOW()
    WHERE name = $1 AND state::text IN ('created', 'retry')
  `,
    [queueName]
  );

  return result.rowCount || 0;
}

export async function purgeQueue(
  pool: Pool,
  queueName: string,
  schema: string = "pgboss",
  state?: JobState
): Promise<number> {
  const conditions = ["name = $1"];
  const params: unknown[] = [queueName];

  if (state) {
    conditions.push("state = $2");
    params.push(state);
  }

  const result = await pool.query(
    `
    DELETE FROM ${schema}.job
    WHERE ${conditions.join(" AND ")}
  `,
    params
  );

  return result.rowCount || 0;
}

export async function getSchedules(
  pool: Pool,
  schema: string = "pgboss"
): Promise<Schedule[]> {
  const result = await pool.query(`
    SELECT
      name,
      cron,
      timezone,
      data,
      options,
      created_on,
      updated_on
    FROM ${schema}.schedule
    ORDER BY name
  `);

  return result.rows.map((row) => ({
    name: row.name,
    cron: row.cron,
    timezone: row.timezone,
    data: row.data,
    options: row.options,
    createdOn: new Date(row.created_on),
    updatedOn: row.updated_on ? new Date(row.updated_on) : null,
  }));
}

function createEmptyPercentileMetrics(): PercentileMetrics {
  return {
    min: 0,
    max: 0,
    avg: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    count: 0,
  };
}

function parsePercentileMetrics(
  row: Record<string, unknown>,
  prefix: string
): PercentileMetrics {
  const count = parseInt(row.sample_count as string, 10) || 0;
  if (count === 0) {
    return createEmptyPercentileMetrics();
  }
  return {
    min: parseFloat(row[`${prefix}_min`] as string) || 0,
    max: parseFloat(row[`${prefix}_max`] as string) || 0,
    avg: parseFloat(row[`${prefix}_avg`] as string) || 0,
    p50: parseFloat(row[`${prefix}_p50`] as string) || 0,
    p95: parseFloat(row[`${prefix}_p95`] as string) || 0,
    p99: parseFloat(row[`${prefix}_p99`] as string) || 0,
    count,
  };
}

export async function getSpeedMetrics(
  pool: Pool,
  schema: string = "pgboss",
  options: {
    queueName?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<SpeedMetrics> {
  const { queueName, startDate, endDate } = options;
  const conditions: string[] = [
    "state::text = 'completed'",
    "started_on IS NOT NULL",
    "completed_on IS NOT NULL",
  ];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (queueName) {
    conditions.push(`name = $${paramIndex++}`);
    params.push(queueName);
  }

  if (startDate) {
    conditions.push(`completed_on >= $${paramIndex++}`);
    params.push(startDate.toISOString());
  }

  if (endDate) {
    conditions.push(`completed_on <= $${paramIndex++}`);
    params.push(endDate.toISOString());
  }
  // undefined dates = all time (no date filter)

  const whereClause = conditions.join(" AND ");

  const result = await pool.query(
    `
    SELECT
      -- Processing time (completed_on - started_on)
      MIN(EXTRACT(EPOCH FROM (completed_on - started_on)) * 1000) as processing_min,
      MAX(EXTRACT(EPOCH FROM (completed_on - started_on)) * 1000) as processing_max,
      AVG(EXTRACT(EPOCH FROM (completed_on - started_on)) * 1000) as processing_avg,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_on - started_on)) * 1000) as processing_p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_on - started_on)) * 1000) as processing_p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_on - started_on)) * 1000) as processing_p99,

      -- Wait time (started_on - created_on)
      MIN(EXTRACT(EPOCH FROM (started_on - created_on)) * 1000) as wait_min,
      MAX(EXTRACT(EPOCH FROM (started_on - created_on)) * 1000) as wait_max,
      AVG(EXTRACT(EPOCH FROM (started_on - created_on)) * 1000) as wait_avg,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_on - created_on)) * 1000) as wait_p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_on - created_on)) * 1000) as wait_p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_on - created_on)) * 1000) as wait_p99,

      -- End-to-end latency (completed_on - created_on)
      MIN(EXTRACT(EPOCH FROM (completed_on - created_on)) * 1000) as e2e_min,
      MAX(EXTRACT(EPOCH FROM (completed_on - created_on)) * 1000) as e2e_max,
      AVG(EXTRACT(EPOCH FROM (completed_on - created_on)) * 1000) as e2e_avg,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_on - created_on)) * 1000) as e2e_p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_on - created_on)) * 1000) as e2e_p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_on - created_on)) * 1000) as e2e_p99,

      COUNT(*) as sample_count
    FROM ${schema}.job
    WHERE ${whereClause}
  `,
    params
  );

  const row = result.rows[0] || {};

  return {
    processingTime: parsePercentileMetrics(row, "processing"),
    waitTime: parsePercentileMetrics(row, "wait"),
    endToEndLatency: parsePercentileMetrics(row, "e2e"),
  };
}

export async function getSpeedMetricsOverTime(
  pool: Pool,
  schema: string = "pgboss",
  options: {
    queueName?: string;
    startDate?: Date;
    endDate?: Date;
    granularity?: "minute" | "hour" | "day";
    limit?: number;
  } = {}
): Promise<SpeedMetricsOverTime[]> {
  const { queueName, startDate, endDate, granularity = "minute", limit = 500 } = options;
  const conditions: string[] = [
    "state::text = 'completed'",
    "started_on IS NOT NULL",
    "completed_on IS NOT NULL",
  ];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (queueName) {
    conditions.push(`name = $${paramIndex++}`);
    params.push(queueName);
  }

  if (startDate) {
    conditions.push(`completed_on >= $${paramIndex++}`);
    params.push(startDate.toISOString());
  }

  if (endDate) {
    conditions.push(`completed_on <= $${paramIndex++}`);
    params.push(endDate.toISOString());
  }
  // undefined dates = all time (no date filter)

  const whereClause = conditions.join(" AND ");

  const result = await pool.query(
    `
    SELECT
      date_trunc('${granularity}', completed_on) as time,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_on - started_on)) * 1000) as processing_p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_on - started_on)) * 1000) as processing_p95,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_on - created_on)) * 1000) as wait_p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_on - created_on)) * 1000) as wait_p95,
      COUNT(*) as count
    FROM ${schema}.job
    WHERE ${whereClause}
    GROUP BY date_trunc('${granularity}', completed_on)
    ORDER BY time DESC
    LIMIT $${paramIndex}
  `,
    [...params, limit]
  );

  // Reverse to get chronological order (oldest first)
  return result.rows.reverse().map((row) => ({
    time: new Date(row.time).toISOString(),
    processingTimeP50: parseFloat(row.processing_p50) || 0,
    processingTimeP95: parseFloat(row.processing_p95) || 0,
    waitTimeP50: parseFloat(row.wait_p50) || 0,
    waitTimeP95: parseFloat(row.wait_p95) || 0,
    count: parseInt(row.count, 10),
  }));
}
