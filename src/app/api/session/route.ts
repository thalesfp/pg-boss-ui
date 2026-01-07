import { NextRequest, NextResponse } from "next/server";
import { setSession, getSession, clearSession } from "@/lib/session";
import { validateSchema } from "@/lib/db/validation";
import { poolManager } from "@/lib/db/pool-manager";
import type { SSLMode } from "@/lib/db/types";

export async function POST(request: NextRequest) {
  try {
    // Get current session to close old pool when switching connections
    const oldSession = await getSession();

    const body = await request.json();
    const { connectionId, connectionString, schema = "pgboss", allowSelfSignedCert, caCertificate, sslMode } = body as {
      connectionId: string;
      connectionString: string;
      schema?: string;
      allowSelfSignedCert?: boolean;
      caCertificate?: string;
      sslMode?: SSLMode;
    };

    if (!connectionId || !connectionString) {
      return NextResponse.json(
        { error: "connectionId and connectionString are required" },
        { status: 400 }
      );
    }

    // Validate schema before storing in session
    const validatedSchema = validateSchema(schema);

    await setSession({
      connectionId,
      connectionString,
      schema: validatedSchema,
      allowSelfSignedCert,
      caCertificate,
      sslMode,
    });

    // Close old pool if switching connections or changing SSL options
    const shouldCloseOldPool = oldSession && (
      oldSession.connectionString !== connectionString ||
      oldSession.allowSelfSignedCert !== allowSelfSignedCert ||
      oldSession.caCertificate !== caCertificate ||
      oldSession.sslMode !== sslMode
    );

    if (shouldCloseOldPool) {
      await poolManager.closePool(
        oldSession.connectionString,
        {
          allowSelfSignedCert: oldSession.allowSelfSignedCert,
          caCertificate: oldSession.caCertificate,
          sslMode: oldSession.sslMode,
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting session:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      connectionId: session.connectionId,
      schema: session.schema,
    });
  } catch (error) {
    console.error("Error getting session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Get current session to retrieve connectionString BEFORE clearing
    const session = await getSession();

    // Clear the session (removes credentials and cookie)
    await clearSession();

    // Close the pool for this connection if it exists
    if (session?.connectionString) {
      await poolManager.closePool(
        session.connectionString,
        {
          allowSelfSignedCert: session.allowSelfSignedCert,
          caCertificate: session.caCertificate,
          sslMode: session.sslMode,
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
