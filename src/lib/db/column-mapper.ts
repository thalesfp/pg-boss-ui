export type ColumnCase = 'camelCase' | 'snake_case';

export interface ColumnMap {
  // Timestamp columns
  completed_on: string;
  created_on: string;
  started_on: string;
  singleton_on: string;
  updated_on: string;

  // Retry columns
  retry_limit: string;
  retry_count: string;
  retry_delay: string;
  retry_backoff: string;

  // Scheduling columns
  start_after: string;
  expire_in: string;
  keep_until: string;

  // Singleton columns
  singleton_key: string;

  // Other columns
  dead_letter: string;
}

export class ColumnMapper {
  private readonly columnMap: ColumnMap;

  constructor(columnCase: ColumnCase) {
    this.columnMap = this.buildColumnMap(columnCase);
  }

  private buildColumnMap(columnCase: ColumnCase): ColumnMap {
    if (columnCase === 'snake_case') {
      return {
        completed_on: 'completed_on',
        created_on: 'created_on',
        started_on: 'started_on',
        singleton_on: 'singleton_on',
        updated_on: 'updated_on',
        retry_limit: 'retry_limit',
        retry_count: 'retry_count',
        retry_delay: 'retry_delay',
        retry_backoff: 'retry_backoff',
        start_after: 'start_after',
        expire_in: 'expire_in',
        keep_until: 'keep_until',
        singleton_key: 'singleton_key',
        dead_letter: 'dead_letter',
      };
    } else {
      return {
        completed_on: 'completedOn',
        created_on: 'createdOn',
        started_on: 'startedOn',
        singleton_on: 'singletonOn',
        updated_on: 'updatedOn',
        retry_limit: 'retryLimit',
        retry_count: 'retryCount',
        retry_delay: 'retryDelay',
        retry_backoff: 'retryBackoff',
        start_after: 'startAfter',
        expire_in: 'expireIn',
        keep_until: 'keepUntil',
        singleton_key: 'singletonKey',
        dead_letter: 'deadLetter',
      };
    }
  }

  /**
   * Get database column name from application column name.
   * Use this when constructing SQL queries.
   */
  col(appColumnName: keyof ColumnMap): string {
    return this.columnMap[appColumnName];
  }

  /**
   * Get value from database row using application column name.
   * Use this when mapping query results to application objects.
   */
  getFromRow(row: Record<string, unknown>, appColumnName: keyof ColumnMap): unknown {
    return row[this.columnMap[appColumnName]];
  }
}
