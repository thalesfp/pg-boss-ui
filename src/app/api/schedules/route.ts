import { NextRequest, NextResponse } from "next/server";
import { poolManager } from "@/lib/db/pool-manager";
import { getSchedules } from "@/lib/db/queries";
import { validateSessionConnection } from "@/lib/session";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const connectionId = searchParams.get("connectionId");
  const result = await validateSessionConnection(connectionId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { connectionString, schema, allowSelfSignedCert, caCertificate } = result.session;

  try {
    const pool = poolManager.getPool(connectionString, allowSelfSignedCert, caCertificate);
    const { mapper, capabilities } = await poolManager.getMapper(connectionString, schema, allowSelfSignedCert, caCertificate);
    const schedules = await getSchedules(pool, mapper, schema, capabilities);

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
