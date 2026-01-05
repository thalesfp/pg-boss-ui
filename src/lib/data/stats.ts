import { unstable_cache } from "next/cache";
import { getSession } from "@/lib/session";
import { poolManager } from "@/lib/db/pool-manager";
import { getDashboardStats, getThroughput } from "@/lib/db/queries";
import type { DashboardStats, ThroughputDataPoint } from "@/lib/db/types";

interface DashboardData {
  stats: DashboardStats;
  throughput: ThroughputDataPoint[];
}

/**
 * Get dashboard statistics with caching
 * Cached for 5 seconds with manual revalidation via tags
 */
const getCachedDashboardStats = unstable_cache(
  async (
    connectionString: string,
    schema: string,
    startDate?: string,
    endDate?: string
  ): Promise<DashboardData> => {
    const pool = poolManager.getPool(connectionString);

    const dateOptions = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const [stats, throughput] = await Promise.all([
      getDashboardStats(pool, schema, dateOptions),
      getThroughput(pool, schema, dateOptions),
    ]);

    return { stats, throughput };
  },
  ["dashboard-stats"],
  {
    revalidate: 5, // 5 seconds
    tags: ["stats", "dashboard"],
  }
);

/**
 * Fetch dashboard data for the current session
 * @param startDate - Optional start date for filtering
 * @param endDate - Optional end date for filtering
 * @returns Dashboard stats and throughput data
 * @throws Error if no active session
 */
export async function getDashboardData(
  startDate?: Date,
  endDate?: Date
): Promise<DashboardData> {
  const session = await getSession();

  if (!session) {
    throw new Error("No active connection");
  }

  return getCachedDashboardStats(
    session.connectionString,
    session.schema,
    startDate?.toISOString(),
    endDate?.toISOString()
  );
}
