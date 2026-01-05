import { NextRequest, NextResponse } from "next/server";
import { poolManager } from "@/lib/db/pool-manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionString, schema = "pgboss" } = body as {
      connectionString: string;
      schema?: string;
    };

    if (!connectionString) {
      return NextResponse.json(
        { error: "connectionString is required" },
        { status: 400 }
      );
    }

    const result = await poolManager.testConnection(connectionString, schema);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error testing connection:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
