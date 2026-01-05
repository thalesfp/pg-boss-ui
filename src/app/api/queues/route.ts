import { NextRequest, NextResponse } from "next/server";
import { poolManager } from "@/lib/db/pool-manager";
import { getQueues, getQueueStats } from "@/lib/db/queries";
import { validateSessionConnection } from "@/lib/session";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const connectionId = searchParams.get("connectionId");
  const result = await validateSessionConnection(connectionId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { connectionString, schema } = result.session;

  try {
    const pool = poolManager.getPool(connectionString);
    const [queues, stats] = await Promise.all([
      getQueues(pool, schema),
      getQueueStats(pool, schema),
    ]);

    // Merge queue metadata with stats
    const mergedQueues = queues.map((queue) => {
      const queueStats = stats.find((s) => s.name === queue.name);
      return { ...queue, stats: queueStats };
    });

    // Add queues that exist in jobs but not in queue table
    const queueNames = new Set(queues.map((q) => q.name));
    const orphanedStats = stats
      .filter((s) => !queueNames.has(s.name))
      .map((s) => ({
        name: s.name,
        policy: null,
        retryLimit: null,
        retryDelay: null,
        retryBackoff: null,
        expireIn: null,
        retentionDays: null,
        deadLetter: null,
        createdOn: new Date(),
        updatedOn: null,
        stats: s,
      }));

    return NextResponse.json([...mergedQueues, ...orphanedStats]);
  } catch (error) {
    console.error("Error fetching queues:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
