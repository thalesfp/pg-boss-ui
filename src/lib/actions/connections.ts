"use server";

import { poolManager } from "@/lib/db/pool-manager";
import { validateSchema } from "@/lib/db/validation";

interface TestConnectionResult {
  success: boolean;
  error?: string;
}

/**
 * Test a database connection
 * @param connectionString - PostgreSQL connection string
 * @param schema - Schema name (default: "pgboss")
 * @returns Test result with success status and optional error message
 */
export async function testConnection(
  connectionString: string,
  schema: string = "pgboss"
): Promise<TestConnectionResult> {
  try {
    // Validate schema name
    const validatedSchema = validateSchema(schema);

    // Test the connection
    const result = await poolManager.testConnection(connectionString, validatedSchema);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Connection test failed",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to test connection",
    };
  }
}
