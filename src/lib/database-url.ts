/**
 * Resolve Postgres connection string for Drizzle / Neon / Vercel.
 *
 * Vercel’s Neon integration often injects `POSTGRES_URL` or `NEON_DATABASE_URL`.
 * If the app only reads `DATABASE_URL` while migrations ran against another var,
 * you get “relation does not exist” on production.
 */
export const DATABASE_CONNECTION_ENV_KEYS = [
  // In Vercel + Neon, these are typically injected automatically.
  "POSTGRES_URL",
  "NEON_DATABASE_URL",
  // Explicit app-level fallback.
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

export type DatabaseConnectionEnvKey = (typeof DATABASE_CONNECTION_ENV_KEYS)[number];

/** First non-empty env value, in priority order. */
export function resolveDatabaseConnectionString(): string | undefined {
  for (const key of DATABASE_CONNECTION_ENV_KEYS) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

/** Which env key supplied the URL (for diagnostics only). */
export function resolveDatabaseConnectionSource(): DatabaseConnectionEnvKey | null {
  for (const key of DATABASE_CONNECTION_ENV_KEYS) {
    if (process.env[key]?.trim()) return key;
  }
  return null;
}

/** Host + database name for logs/diagnostics (never log the full URL). */
export function safeDatabaseHostAndDatabase(
  connectionString: string
): { host: string; database: string } | { error: string } {
  if (!connectionString.trim()) return { error: "empty_connection_string" };
  try {
    const u = new URL(connectionString);
    const database = (u.pathname || "").replace(/^\//, "").split("?")[0];
    return { host: u.hostname, database: database || "(none)" };
  } catch {
    return { error: "invalid_connection_string_url" };
  }
}
