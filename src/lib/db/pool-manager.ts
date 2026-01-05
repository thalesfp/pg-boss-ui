import { Pool, PoolConfig } from "pg";
import { createHash } from "crypto";

interface SslOptions {
  allowSelfSignedCert?: boolean;
  caCertificate?: string;
}

class PoolManager {
  private pools: Map<string, Pool> = new Map();

  private getPoolKey(connectionString: string, sslOptions?: SslOptions): string {
    const sslKey = sslOptions?.caCertificate
      ? `ca:${createHash("sha256").update(sslOptions.caCertificate).digest("hex").slice(0, 8)}`
      : sslOptions?.allowSelfSignedCert
        ? "selfsigned"
        : "default";
    return `${connectionString}:ssl=${sslKey}`;
  }

  private getSslConfig(sslOptions?: SslOptions): PoolConfig["ssl"] {
    if (sslOptions?.caCertificate) {
      // Use provided CA certificate for verification
      return { ca: sslOptions.caCertificate };
    }
    if (sslOptions?.allowSelfSignedCert) {
      // Disable certificate verification entirely
      return { rejectUnauthorized: false, checkServerIdentity: () => undefined };
    }
    // Use default SSL behavior
    return undefined;
  }

  getPool(connectionString: string, allowSelfSignedCert?: boolean, caCertificate?: string): Pool {
    const sslOptions: SslOptions = { allowSelfSignedCert, caCertificate };
    const poolKey = this.getPoolKey(connectionString, sslOptions);
    let pool = this.pools.get(poolKey);

    if (!pool) {
      const config: PoolConfig = {
        connectionString,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: this.getSslConfig(sslOptions),
      };

      pool = new Pool(config);

      pool.on("error", (err) => {
        console.error("Unexpected pool error:", err);
      });

      this.pools.set(poolKey, pool);
    }

    return pool;
  }

  async testConnection(
    connectionString: string,
    schema: string = "pgboss",
    allowSelfSignedCert?: boolean,
    caCertificate?: string
  ): Promise<{ success: boolean; error?: string }> {
    const sslOptions: SslOptions = { allowSelfSignedCert, caCertificate };
    const pool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 5000,
      ssl: this.getSslConfig(sslOptions),
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

  async closePool(connectionString: string, allowSelfSignedCert?: boolean, caCertificate?: string): Promise<void> {
    const sslOptions: SslOptions = { allowSelfSignedCert, caCertificate };
    const poolKey = this.getPoolKey(connectionString, sslOptions);
    const pool = this.pools.get(poolKey);
    if (pool) {
      await pool.end();
      this.pools.delete(poolKey);
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
