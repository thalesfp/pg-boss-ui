import { unstable_cache } from "next/cache";
import { getSession } from "@/lib/session";
import { poolManager } from "@/lib/db/pool-manager";
import { getQueuesWithStats, getQueueStats, type QueueWithStats } from "@/lib/db/queries";
import type { QueueStats } from "@/lib/db/types";

/**
 * Get queues with statistics using combined query
 * Cached for 5 seconds with manual revalidation via tags
 */
const getCachedQueuesWithStats = unstable_cache(
  async (connectionString: string, schema: string, allowSelfSignedCert?: boolean, caCertificate?: string): Promise<QueueWithStats[]> => {
    const pool = poolManager.getPool(connectionString, allowSelfSignedCert, caCertificate);
    return getQueuesWithStats(pool, schema);
  },
  ["queues-with-stats"],
  {
    revalidate: 5, // 5 seconds
    tags: ["queues", "stats"],
  }
);

/**
 * Fetch queues with statistics for the current session
 * Uses the optimized getQueuesWithStats query (2 queries instead of N+1)
 * @returns Array of queues with their statistics
 * @throws Error if no active session
 */
export async function getQueuesData(): Promise<QueueWithStats[]> {
  const session = await getSession();

  if (!session) {
    throw new Error("No active connection");
  }

  return getCachedQueuesWithStats(session.connectionString, session.schema, session.allowSelfSignedCert, session.caCertificate);
}

/**
 * Get queue statistics for a specific queue
 * Cached for 5 seconds with manual revalidation
 */
const getCachedQueueStats = unstable_cache(
  async (
    connectionString: string,
    schema: string,
    queueName: string,
    allowSelfSignedCert?: boolean,
    caCertificate?: string
  ): Promise<QueueStats | null> => {
    const pool = poolManager.getPool(connectionString, allowSelfSignedCert, caCertificate);
    const stats = await getQueueStats(pool, schema);
    return stats.find((s) => s.name === queueName) || null;
  },
  ["queue-stats"],
  {
    revalidate: 5, // 5 seconds
    tags: ["queues", "stats"],
  }
);

/**
 * Fetch statistics for a specific queue
 * @param queueName - Name of the queue
 * @returns Queue statistics or null if not found
 * @throws Error if no active session
 */
export async function getQueueStatsData(queueName: string): Promise<QueueStats | null> {
  const session = await getSession();

  if (!session) {
    throw new Error("No active connection");
  }

  return getCachedQueueStats(session.connectionString, session.schema, queueName, session.allowSelfSignedCert, session.caCertificate);
}
