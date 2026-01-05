"use server";

import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/session";
import { poolManager } from "@/lib/db/pool-manager";
import { purgeQueue as dbPurgeQueue } from "@/lib/db/queries";
import { validateQueueName, validateJobState } from "@/lib/db/validation";
import type { JobState } from "@/lib/db/types";

interface ActionResult {
  success: boolean;
  error?: string;
  deleted?: number;
}

/**
 * Purge jobs from a queue
 * @param queueName - Queue name to purge jobs from
 * @param state - Optional job state to filter purge (if not provided, purges all jobs)
 * @returns Action result with success status and count of deleted jobs
 */
export async function purgeQueue(
  queueName: string,
  state?: JobState
): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "No active connection" };
    }

    const validatedQueueName = validateQueueName(queueName);
    const validatedState = state ? validateJobState(state) : undefined;
    const pool = poolManager.getPool(session.connectionString);

    const deleted = await dbPurgeQueue(
      pool,
      validatedQueueName,
      session.schema,
      validatedState
    );

    // Revalidate cache tags to update UI
    revalidateTag("jobs", "max");
    revalidateTag("queues", "max");
    revalidateTag("stats", "max");
    revalidateTag("dashboard", "max");

    return { success: true, deleted };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to purge queue",
    };
  }
}
