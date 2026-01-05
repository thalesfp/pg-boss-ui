import type { DateField, JobState } from "./types";

const VALID_DATE_FIELDS = new Set<string>(["created_on", "completed_on"]);
const VALID_GRANULARITIES = new Set<string>(["minute", "hour", "day"]);
const VALID_JOB_STATES = new Set<string>([
  "created",
  "retry",
  "active",
  "completed",
  "cancelled",
  "failed",
]);

// Schema names must be valid PostgreSQL identifiers:
// - Start with letter or underscore
// - Contain only letters, digits, underscores
// - Max 63 characters
const SCHEMA_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;

export function validateSchema(schema: string): string {
  if (!SCHEMA_PATTERN.test(schema)) {
    throw new Error(`Invalid schema name: ${schema}`);
  }
  return schema;
}

export function validateDateField(field: string | undefined): DateField | undefined {
  if (field === undefined) return undefined;
  if (!VALID_DATE_FIELDS.has(field)) {
    throw new Error(`Invalid date field: ${field}. Must be one of: created_on, completed_on`);
  }
  return field as DateField;
}

export function validateGranularity(
  granularity: string
): "minute" | "hour" | "day" {
  if (!VALID_GRANULARITIES.has(granularity)) {
    throw new Error(
      `Invalid granularity: ${granularity}. Must be one of: minute, hour, day`
    );
  }
  return granularity as "minute" | "hour" | "day";
}

export function validateJobState(state: string | undefined): JobState | undefined {
  if (state === undefined) return undefined;
  if (!VALID_JOB_STATES.has(state)) {
    throw new Error(
      `Invalid job state: ${state}. Must be one of: created, retry, active, completed, cancelled, failed`
    );
  }
  return state as JobState;
}

// Queue names in pg-boss can include common namespacing characters
const QUEUE_NAME_PATTERN = /^[a-zA-Z0-9_\-:./@]+$/;

export function validateQueueName(name: string): string {
  if (!QUEUE_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid queue name: ${name}`);
  }
  return name;
}

// Job IDs are UUIDs
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateJobId(id: string): string {
  if (!UUID_PATTERN.test(id)) {
    throw new Error(`Invalid job ID: ${id}`);
  }
  return id;
}

// Sort fields for jobs table
const VALID_SORT_FIELDS = new Set<string>([
  "id",
  "state",
  "priority",
  "created_on",
  "completed_on",
]);

export type SortField = "id" | "state" | "priority" | "created_on" | "completed_on";

export function validateSortBy(field: string | undefined): SortField | undefined {
  if (field === undefined) return undefined;
  if (!VALID_SORT_FIELDS.has(field)) {
    throw new Error(
      `Invalid sort field: ${field}. Must be one of: id, state, priority, created_on, completed_on`
    );
  }
  return field as SortField;
}

// Sort order (asc/desc)
const VALID_SORT_ORDERS = new Set<string>(["asc", "desc"]);

export type SortOrder = "asc" | "desc";

export function validateSortOrder(order: string | undefined): SortOrder | undefined {
  if (order === undefined) return undefined;
  const lowerOrder = order.toLowerCase();
  if (!VALID_SORT_ORDERS.has(lowerOrder)) {
    throw new Error(`Invalid sort order: ${order}. Must be one of: asc, desc`);
  }
  return lowerOrder as SortOrder;
}

// Date string validation
export function validateDate(dateStr: string | null): Date | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date;
}
