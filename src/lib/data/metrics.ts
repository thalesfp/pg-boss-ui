import { unstable_cache } from "next/cache";
import { getSession } from "@/lib/session";
import { poolManager } from "@/lib/db/pool-manager";
import { getSpeedMetrics, getSpeedMetricsOverTime } from "@/lib/db/queries";
import type { SpeedMetrics, SpeedMetricsOverTime } from "@/lib/db/types";

interface MetricsData {
  metrics: SpeedMetrics;
  timeSeries: SpeedMetricsOverTime[];
}

interface GetMetricsOptions {
  queueName?: string;
  startDate?: Date;
  endDate?: Date;
  granularity?: "minute" | "hour" | "day";
}

/**
 * Get speed metrics with caching
 * Cached for 30 seconds (longer than stats since metrics are more expensive)
 */
const getCachedSpeedMetrics = unstable_cache(
  async (
    connectionString: string,
    schema: string,
    queueName?: string,
    startDate?: string,
    endDate?: string,
    granularity?: "minute" | "hour" | "day",
    allowSelfSignedCert?: boolean,
    caCertificate?: string,
    sslMode?: import("../db/types").SSLMode
  ): Promise<MetricsData> => {
    const pool = poolManager.getPool(connectionString, allowSelfSignedCert, caCertificate, sslMode);
    const { mapper } = await poolManager.getMapper(connectionString, schema, allowSelfSignedCert, caCertificate, sslMode);

    const dateOptions = {
      queueName,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      granularity,
    };

    const [metrics, timeSeries] = await Promise.all([
      getSpeedMetrics(pool, mapper, schema, dateOptions),
      getSpeedMetricsOverTime(pool, mapper, schema, dateOptions),
    ]);

    return { metrics, timeSeries };
  },
  ["speed-metrics"],
  {
    revalidate: 30, // 30 seconds (longer cache for expensive queries)
    tags: ["metrics"],
  }
);

/**
 * Fetch speed metrics for the current session
 * @param options - Filtering options for metrics
 * @returns Speed metrics and time series data
 * @throws Error if no active session
 */
export async function getMetricsData(options: GetMetricsOptions = {}): Promise<MetricsData> {
  const session = await getSession();

  if (!session) {
    throw new Error("No active connection");
  }

  const { queueName, startDate, endDate, granularity = "minute" } = options;

  return getCachedSpeedMetrics(
    session.connectionString,
    session.schema,
    queueName,
    startDate?.toISOString(),
    endDate?.toISOString(),
    granularity,
    session.allowSelfSignedCert,
    session.caCertificate,
    session.sslMode
  );
}
