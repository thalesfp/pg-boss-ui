import { NextRequest } from "next/server";
import { poolManager } from "@/lib/db/pool-manager";
import { getDashboardStats, getQueueStats } from "@/lib/db/queries";
import { validateSessionConnection } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const connectionId = searchParams.get("connectionId");
  const result = await validateSessionConnection(connectionId);
  if ("error" in result) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { connectionString, schema, allowSelfSignedCert, caCertificate } = result.session;
  const DEFAULT_INTERVAL = 2000;
  const MIN_INTERVAL = 1000;
  const rawInterval = parseInt(searchParams.get("interval") || String(DEFAULT_INTERVAL), 10);
  const interval = Number.isNaN(rawInterval) || rawInterval < MIN_INTERVAL
    ? DEFAULT_INTERVAL
    : rawInterval;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const pool = poolManager.getPool(connectionString, allowSelfSignedCert, caCertificate);

      const sendUpdate = async () => {
        try {
          const [stats, queues] = await Promise.all([
            getDashboardStats(pool, schema),
            getQueueStats(pool, schema),
          ]);

          const data = JSON.stringify({
            type: "update",
            timestamp: new Date().toISOString(),
            stats,
            queues,
          });

          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          const errorData = JSON.stringify({
            type: "error",
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        }
      };

      // Send initial update
      await sendUpdate();

      // Set up interval for subsequent updates
      const intervalId = setInterval(sendUpdate, interval);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
