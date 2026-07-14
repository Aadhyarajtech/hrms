/** Converts a snake_case DB row (or array of rows) into camelCase for API responses. */
export function toCamel<T = any>(input: any): T {
  if (Array.isArray(input)) return input.map(toCamel) as any;
  if (input === null || typeof input !== "object" || input instanceof Date) return input;

  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camelKey] = value;
  }
  return out as T;
}

/** Converts boolean-ish SQLite integers (0/1) to real booleans for the given keys. */
export function withBooleans<T extends Record<string, any>>(row: T, keys: (keyof T)[]): T {
  const copy = { ...row };
  for (const k of keys) (copy as any)[k] = !!copy[k];
  return copy;
}
