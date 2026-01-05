import { NextRequest, NextResponse } from "next/server";
import { poolManager } from "@/lib/db/pool-manager";
import { getSpeedMetrics, getSpeedMetricsOverTime } from "@/lib/db/queries";
import { validateSessionConnection } from "@/lib/session";
import { validateQueueName, validateGranularity, validateDate } from "@/lib/db/validation";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const connectionId = searchParams.get("connectionId");
  const result = await validateSessionConnection(connectionId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { connectionString, schema, allowSelfSignedCert, caCertificate } = result.session;

  try {
    const queueNameParam = searchParams.get("queueName");
    const queueName = queueNameParam ? validateQueueName(queueNameParam) : undefined;
    const isAllTime = searchParams.get("range") === "all";
    const startDate = isAllTime ? undefined : validateDate(searchParams.get("startDate"));
    const endDate = isAllTime ? undefined : validateDate(searchParams.get("endDate"));
    const granularity = validateGranularity(
      searchParams.get("granularity") || "minute"
    );

    const pool = poolManager.getPool(connectionString, allowSelfSignedCert, caCertificate);
    const options = { queueName, startDate, endDate };

    const [metrics, timeSeries] = await Promise.all([
      getSpeedMetrics(pool, schema, options),
      getSpeedMetricsOverTime(pool, schema, { ...options, granularity }),
    ]);

    return NextResponse.json({ metrics, timeSeries });
  } catch (error) {
    console.error("Error fetching speed metrics:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
