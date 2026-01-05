import type { DateField } from "./types";

export interface DateFilterOptions {
  dateField?: DateField;
  startDate?: Date;
  endDate?: Date;
}

export interface QueryConditions {
  conditions: string[];
  params: unknown[];
  nextParamIndex: number;
}

/**
 * Builds date filter conditions for SQL queries
 * @param options - Date filtering options
 * @param startParamIndex - Starting parameter index (default: 1)
 * @returns Query conditions, parameters, and next parameter index
 */
export function buildDateConditions(
  options: DateFilterOptions,
  startParamIndex: number = 1
): QueryConditions {
  const { dateField = "created_on", startDate, endDate } = options;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = startParamIndex;

  if (startDate) {
    conditions.push(`${dateField} >= $${paramIndex++}`);
    params.push(startDate.toISOString());
  }

  if (endDate) {
    conditions.push(`${dateField} <= $${paramIndex++}`);
    params.push(endDate.toISOString());
  }

  return {
    conditions,
    params,
    nextParamIndex: paramIndex,
  };
}

/**
 * Builds a WHERE clause from an array of conditions
 * @param conditions - Array of SQL condition strings
 * @returns WHERE clause or empty string if no conditions
 */
export function buildWhereClause(conditions: string[]): string {
  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

/**
 * Builds an AND clause from an array of conditions
 * @param conditions - Array of SQL condition strings
 * @returns AND clause or empty string if no conditions
 */
export function buildAndClause(conditions: string[]): string {
  return conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";
}
