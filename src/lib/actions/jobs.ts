"use server";

import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/session";
import { poolManager } from "@/lib/db/pool-manager";
import {
  retryJob as dbRetryJob,
  cancelJob as dbCancelJob,
  retryAllJobs as dbRetryAllJobs,
  cancelAllJobs as dbCancelAllJobs,
} from "@/lib/db/queries";
import { validateJobId, validateQueueName } from "@/lib/db/validation";

interface ActionResult {
  success: boolean;
  error?: string;
  newJobId?: string;
  count?: number;
}

/**
 * Retry a failed or cancelled job
 * @param jobId - Job ID to retry
 * @returns Action result with success status and new job ID
 */
export async function retryJob(jobId: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "No active connection" };
    }

    const validatedJobId = validateJobId(jobId);
    const pool = poolManager.getPool(session.connectionString, session.allowSelfSignedCert, session.caCertificate);
    const { mapper } = await poolManager.getMapper(session.connectionString, session.schema, session.allowSelfSignedCert, session.caCertificate);

    const newJobId = await dbRetryJob(pool, mapper, validatedJobId, session.schema);

    // Revalidate cache tags to update UI
    revalidateTag("jobs", "max");
    revalidateTag("stats", "max");
    revalidateTag("dashboard", "max");

    return { success: true, newJobId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to retry job",
    };
  }
}

/**
 * Cancel a created or retry job
 * @param jobId - Job ID to cancel
 * @returns Action result with success status
 */
export async function cancelJob(jobId: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "No active connection" };
    }

    const validatedJobId = validateJobId(jobId);
    const pool = poolManager.getPool(session.connectionString, session.allowSelfSignedCert, session.caCertificate);
    const { mapper } = await poolManager.getMapper(session.connectionString, session.schema, session.allowSelfSignedCert, session.caCertificate);

    const result = await dbCancelJob(pool, mapper, validatedJobId, session.schema);

    if (!result) {
      return { success: false, error: "Job not found or not in a cancellable state" };
    }

    // Revalidate cache tags to update UI
    revalidateTag("jobs", "max");
    revalidateTag("stats", "max");
    revalidateTag("dashboard", "max");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel job",
    };
  }
}

/**
 * Retry all failed and cancelled jobs in a queue
 * @param queueName - Queue name to retry jobs from
 * @returns Action result with success status and count of retried jobs
 */
export async function retryAllJobs(queueName: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "No active connection" };
    }

    const validatedQueueName = validateQueueName(queueName);
    const pool = poolManager.getPool(session.connectionString, session.allowSelfSignedCert, session.caCertificate);
    const { mapper } = await poolManager.getMapper(session.connectionString, session.schema, session.allowSelfSignedCert, session.caCertificate);

    const count = await dbRetryAllJobs(pool, mapper, validatedQueueName, session.schema);

    // Revalidate cache tags to update UI
    revalidateTag("jobs", "max");
    revalidateTag("stats", "max");
    revalidateTag("dashboard", "max");
    revalidateTag("queues", "max");

    return { success: true, count };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to retry jobs",
    };
  }
}

/**
 * Cancel all created and retry jobs in a queue
 * @param queueName - Queue name to cancel jobs from
 * @returns Action result with success status and count of cancelled jobs
 */
export async function cancelAllJobs(queueName: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "No active connection" };
    }

    const validatedQueueName = validateQueueName(queueName);
    const pool = poolManager.getPool(session.connectionString, session.allowSelfSignedCert, session.caCertificate);
    const { mapper } = await poolManager.getMapper(session.connectionString, session.schema, session.allowSelfSignedCert, session.caCertificate);

    const count = await dbCancelAllJobs(pool, mapper, validatedQueueName, session.schema);

    // Revalidate cache tags to update UI
    revalidateTag("jobs", "max");
    revalidateTag("stats", "max");
    revalidateTag("dashboard", "max");
    revalidateTag("queues", "max");

    return { success: true, count };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel jobs",
    };
  }
}
