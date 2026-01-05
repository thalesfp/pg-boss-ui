import { unstable_cache } from "next/cache";
import { getSession } from "@/lib/session";
import { poolManager } from "@/lib/db/pool-manager";
import { getJobs, getJob } from "@/lib/db/queries";
import type { Job, JobState, DateField } from "@/lib/db/types";

interface JobsData {
  jobs: Job[];
  total: number;
}

interface GetJobsOptions {
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
}

/**
 * Get jobs with caching
 * Cached for 5 seconds with manual revalidation via tags
 */
const getCachedJobs = unstable_cache(
  async (
    connectionString: string,
    schema: string,
    options: GetJobsOptions
  ): Promise<JobsData> => {
    const pool = poolManager.getPool(connectionString);
    return getJobs(pool, schema, options);
  },
  ["jobs"],
  {
    revalidate: 5, // 5 seconds
    tags: ["jobs"],
  }
);

/**
 * Fetch jobs for the current session
 * @param options - Job filtering and pagination options
 * @returns Jobs list and total count
 * @throws Error if no active session
 */
export async function getJobsData(options: GetJobsOptions = {}): Promise<JobsData> {
  const session = await getSession();

  if (!session) {
    throw new Error("No active connection");
  }

  return getCachedJobs(session.connectionString, session.schema, options);
}

/**
 * Get a single job by ID with caching
 * Cached for 5 seconds with manual revalidation
 */
const getCachedJob = unstable_cache(
  async (
    connectionString: string,
    schema: string,
    jobId: string
  ): Promise<Job | null> => {
    const pool = poolManager.getPool(connectionString);
    return getJob(pool, jobId, schema);
  },
  ["job-detail"],
  {
    revalidate: 5, // 5 seconds
    tags: ["jobs"],
  }
);

/**
 * Fetch a single job by ID for the current session
 * @param jobId - Job ID to fetch
 * @returns Job or null if not found
 * @throws Error if no active session
 */
export async function getJobData(jobId: string): Promise<Job | null> {
  const session = await getSession();

  if (!session) {
    throw new Error("No active connection");
  }

  return getCachedJob(session.connectionString, session.schema, jobId);
}
