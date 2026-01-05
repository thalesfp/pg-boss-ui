import { NextRequest, NextResponse } from "next/server";
import { poolManager } from "@/lib/db/pool-manager";
import { getJobs, getJob } from "@/lib/db/queries";
import { validateSessionConnection } from "@/lib/session";
import { validateQueueName, validateJobState, validateDateField, validateJobId, validateSortBy, validateSortOrder, validateDate } from "@/lib/db/validation";

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
    const state = validateJobState(searchParams.get("state") || undefined);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!Number.isFinite(limit) || limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: "limit must be a number between 1 and 1000" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(offset) || offset < 0) {
      return NextResponse.json(
        { error: "offset must be a non-negative number" },
        { status: 400 }
      );
    }

    const search = searchParams.get("search") || undefined;
    const jobIdParam = searchParams.get("jobId");
    const dateField = validateDateField(searchParams.get("dateField") || undefined);
    const startDate = validateDate(searchParams.get("startDate"));
    const endDate = validateDate(searchParams.get("endDate"));
    const sortBy = validateSortBy(searchParams.get("sortBy") || undefined);
    const sortOrder = validateSortOrder(searchParams.get("sortOrder") || undefined);

    const pool = poolManager.getPool(connectionString, allowSelfSignedCert, caCertificate);
    const { mapper } = await poolManager.getMapper(connectionString, schema, allowSelfSignedCert, caCertificate);

    // If jobId is provided, return single job
    if (jobIdParam) {
      const jobId = validateJobId(jobIdParam);
      const job = await getJob(pool, mapper, jobId, schema);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json(job);
    }

    // Otherwise return paginated list
    const result = await getJobs(pool, mapper, schema, {
      queueName,
      state,
      limit,
      offset,
      search,
      dateField,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
