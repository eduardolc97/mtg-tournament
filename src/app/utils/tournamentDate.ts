/** PostgreSQL returns timestamp-without-time-zone values without a suffix. */
export function parseStoredUtcTimestamp(raw: string): Date {
  return new Date(
    /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`
  );
}
