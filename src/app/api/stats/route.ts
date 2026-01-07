import { NextRequest, NextResponse } from "next/server";
import { poolManager } from "@/lib/db/pool-manager";
import { getDashboardStats, getThroughput } from "@/lib/db/queries";
import { validateSessionConnection } from "@/lib/session";
import { validateDate } from "@/lib/db/validation";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const connectionId = searchParams.get("connectionId");
  const result = await validateSessionConnection(connectionId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { connectionString, schema, allowSelfSignedCert, caCertificate, sslMode } = result.session;

  try {
    const isAllTime = searchParams.get("range") === "all";
    const startDate = isAllTime ? undefined : validateDate(searchParams.get("startDate"));
    const endDate = isAllTime ? undefined : validateDate(searchParams.get("endDate"));

    const pool = poolManager.getPool(connectionString, allowSelfSignedCert, caCertificate, sslMode);
    const { mapper } = await poolManager.getMapper(connectionString, schema, allowSelfSignedCert, caCertificate, sslMode);
    const dateOptions = { startDate, endDate };
    const [stats, throughput] = await Promise.all([
      getDashboardStats(pool, mapper, schema, dateOptions),
      getThroughput(pool, mapper, schema, dateOptions),
    ]);

    return NextResponse.json({ stats, throughput });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
