import { Pool, PoolConfig } from "pg";
import { createHash } from "crypto";
import { ColumnMapper, type ColumnCase } from "./column-mapper";

interface SslOptions {
  allowSelfSignedCert?: boolean;
  caCertificate?: string;
}

export interface SchemaCapabilities {
  hasQueueTable: boolean;
  hasScheduleTable: boolean;
}

interface PoolMetadata {
  pool: Pool;
  schemaVersion: number | null;
  columnCase: ColumnCase;
  capabilities: SchemaCapabilities | null;
}

class PoolManager {
  private pools: Map<string, PoolMetadata> = new Map();

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
    let metadata = this.pools.get(poolKey);

    if (!metadata) {
      const config: PoolConfig = {
        connectionString,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: this.getSslConfig(sslOptions),
      };

      const pool = new Pool(config);

      pool.on("error", (err) => {
        console.error("Unexpected pool error:", err);
      });

      metadata = {
        pool,
        schemaVersion: null,
        columnCase: 'snake_case', // Default, will be detected on first use
        capabilities: null,
      };

      this.pools.set(poolKey, metadata);
    }

    return metadata.pool;
  }

  private async detectSchemaVersion(pool: Pool, schema: string): Promise<number> {
    try {
      const result = await pool.query(
        `SELECT version FROM ${schema}.version ORDER BY version DESC LIMIT 1`
      );

      if (result.rows.length === 0) {
        // No version found, detect column case from actual job table columns
        console.warn(`No version found in ${schema}.version table, detecting column case from job table`);
        return await this.detectColumnCaseFromJobTable(pool, schema);
      }

      const version = parseInt(result.rows[0].version, 10);
      console.log(`Detected pg-boss schema version: ${version} (${version >= 23 ? 'snake_case' : 'camelCase'})`);
      return version;
    } catch (error) {
      // Version table doesn't exist, try detecting from job table
      console.warn(`Version table not found, detecting column case from job table`);
      try {
        return await this.detectColumnCaseFromJobTable(pool, schema);
      } catch (detectionError) {
        console.error(`Failed to detect column case: ${detectionError instanceof Error ? detectionError.message : 'Unknown error'}`);
        // Last resort: default to camelCase for older pg-boss versions
        return 22; // v9 and earlier use camelCase
      }
    }
  }

  private async detectColumnCaseFromJobTable(pool: Pool, schema: string): Promise<number> {
    // Query actual column names from job table
    const result = await pool.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'job'
      AND column_name IN ('created_on', 'createdOn')
      LIMIT 1
      `,
      [schema]
    );

    if (result.rows.length === 0) {
      throw new Error('Could not detect column case: job table columns not found');
    }

    const columnName = result.rows[0].column_name;
    const isSnakeCase = columnName === 'created_on';

    console.log(`Detected column case: ${isSnakeCase ? 'snake_case (v10+)' : 'camelCase (v8/v9)'}`);

    // Return a version number that maps to the correct column case
    return isSnakeCase ? 23 : 22;
  }

  private getColumnCase(schemaVersion: number): ColumnCase {
    return schemaVersion >= 23 ? 'snake_case' : 'camelCase';
  }

  private async detectSchemaCapabilities(pool: Pool, schema: string): Promise<SchemaCapabilities> {
    try {
      // Check for queue table
      const queueCheck = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = $1
          AND table_name = 'queue'
        ) as exists
        `,
        [schema]
      );

      // Check for schedule table
      const scheduleCheck = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = $1
          AND table_name = 'schedule'
        ) as exists
        `,
        [schema]
      );

      const capabilities = {
        hasQueueTable: queueCheck.rows[0].exists,
        hasScheduleTable: scheduleCheck.rows[0].exists,
      };

      console.log(
        `Detected pg-boss schema capabilities: queue table=${capabilities.hasQueueTable}, schedule table=${capabilities.hasScheduleTable}`
      );

      return capabilities;
    } catch (error) {
      console.warn(
        `Failed to detect schema capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Default to v10+ capabilities
      return {
        hasQueueTable: true,
        hasScheduleTable: true,
      };
    }
  }

  async getMapper(
    connectionString: string,
    schema: string,
    allowSelfSignedCert?: boolean,
    caCertificate?: string
  ): Promise<{ mapper: ColumnMapper; capabilities: SchemaCapabilities }> {
    const sslOptions: SslOptions = { allowSelfSignedCert, caCertificate };
    const poolKey = this.getPoolKey(connectionString, sslOptions);

    // Get or create pool
    const pool = this.getPool(connectionString, allowSelfSignedCert, caCertificate);
    const metadata = this.pools.get(poolKey)!;

    // Detect version and capabilities if not already cached
    if (metadata.schemaVersion === null || metadata.capabilities === null) {
      const [schemaVersion, capabilities] = await Promise.all([
        this.detectSchemaVersion(pool, schema),
        this.detectSchemaCapabilities(pool, schema),
      ]);

      metadata.schemaVersion = schemaVersion;
      metadata.columnCase = this.getColumnCase(schemaVersion);
      metadata.capabilities = capabilities;
    }

    return {
      mapper: new ColumnMapper(metadata.columnCase),
      capabilities: metadata.capabilities,
    };
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
    const metadata = this.pools.get(poolKey);
    if (metadata) {
      await metadata.pool.end();
      this.pools.delete(poolKey);
    }
  }

  async closeAll(): Promise<void> {
    const promises = Array.from(this.pools.values()).map((metadata) => metadata.pool.end());
    await Promise.all(promises);
    this.pools.clear();
  }
}

// Singleton instance
export const poolManager = new PoolManager();
