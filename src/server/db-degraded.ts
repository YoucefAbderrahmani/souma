/**
 * Short-lived hint that Postgres is likely unavailable (e.g. Neon data transfer quota).
 * Lets optional code paths skip DB work (e.g. `getSession`) to avoid noisy repeated failures.
 * Cleared when a successful catalog inventory read runs.
 */

const DEFAULT_OUTAGE_MS = 15 * 60 * 1000;

let databaseOutageOpenUntil = 0;

/** Walk Error.cause, plain objects, and common wrapper keys so Neon quota text is not missed. */
function flattenErrorText(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();

  function walk(e: unknown, depth: number): void {
    if (e == null || depth > 20 || seen.has(e)) return;
    seen.add(e);

    if (typeof e === "string") {
      parts.push(e);
      return;
    }

    if (e instanceof Error) {
      parts.push(e.message);
      if (e instanceof AggregateError && Array.isArray(e.errors)) {
        for (const sub of e.errors) {
          walk(sub, depth + 1);
        }
      }
      walk(e.cause, depth + 1);
      return;
    }

    if (typeof e !== "object") {
      parts.push(String(e));
      return;
    }

    const o = e as Record<string, unknown>;
    for (const k of ["message", "detail", "description", "reason", "hint"]) {
      const v = o[k];
      if (typeof v === "string" && v.length > 0) parts.push(v);
    }

    walk(o.cause, depth + 1);
    walk(o.originalError, depth + 1);
    walk(o.error, depth + 1);

    try {
      parts.push(JSON.stringify(o));
    } catch {
      parts.push(String(o));
    }
  }

  walk(error, 0);
  return parts.join(" ").toLowerCase();
}

export function isNeonDataTransferQuotaError(error: unknown): boolean {
  const text = flattenErrorText(error);
  if (
    /exceeded the data transfer quota|data transfer quota|upgrade your plan to increase limits|transfer limit was reached|compute time quota|quota exceeded/i.test(
      text
    )
  ) {
    return true;
  }
  // Drizzle: outer message is "Failed query: insert into \"verification\"..."; cause may omit traversable message.
  if (/failed query/i.test(text) && /"verification"|into "verification"/i.test(text)) {
    if (/xx000|quota|exceeded|upgrade your plan|transfer limit|neon/i.test(text)) return true;
  }
  return false;
}

/** Session lookup or Neon limits: trip outage backoff so telemetry routes skip `getSession`. */
export function isAuthSessionDbLikelyBlocked(error: unknown): boolean {
  if (isNeonDataTransferQuotaError(error)) return true;
  const text = flattenErrorText(error);
  if (!/failed query/i.test(text)) return false;
  if (!/"session"/.test(text) && !/from "session"/.test(text)) return false;
  return /xx000|exceeded the data transfer|upgrade your plan|connection|timeout|econn/i.test(text);
}

export function noteDatabaseOutage(ms: number = DEFAULT_OUTAGE_MS): void {
  databaseOutageOpenUntil = Math.max(databaseOutageOpenUntil, Date.now() + ms);
}

export function noteDatabaseOutageIfSessionOrQuotaError(error: unknown): void {
  if (isAuthSessionDbLikelyBlocked(error)) noteDatabaseOutage();
}

export function clearDatabaseOutage(): void {
  databaseOutageOpenUntil = 0;
}

export function isDatabaseOutage(): boolean {
  return Date.now() < databaseOutageOpenUntil;
}
