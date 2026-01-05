import { Pool, PoolConfig } from "pg";

class PoolManager {
  private pools: Map<string, Pool> = new Map();

  getPool(connectionString: string): Pool {
    let pool = this.pools.get(connectionString);

    if (!pool) {
      const config: PoolConfig = {
        connectionString,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      };

      pool = new Pool(config);

      pool.on("error", (err) => {
        console.error("Unexpected pool error:", err);
      });

      this.pools.set(connectionString, pool);
    }

    return pool;
  }

  async testConnection(connectionString: string, schema: string = "pgboss"): Promise<{ success: boolean; error?: string }> {
    const pool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await pool.connect();

      // Check if the specified schema exists
      const result = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [schema]
      );

      client.release();
      await pool.end();

      if (result.rows.length === 0) {
        return {
          success: false,
          error: `Schema '${schema}' not found. Make sure pg-boss has been initialized on this database.`,
        };
      }

      return { success: true };
    } catch (error) {
      await pool.end().catch(() => {});
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async closePool(connectionString: string): Promise<void> {
    const pool = this.pools.get(connectionString);
    if (pool) {
      await pool.end();
      this.pools.delete(connectionString);
    }
  }

  async closeAll(): Promise<void> {
    const promises = Array.from(this.pools.values()).map((pool) => pool.end());
    await Promise.all(promises);
    this.pools.clear();
  }
}

// Singleton instance
export const poolManager = new PoolManager();
