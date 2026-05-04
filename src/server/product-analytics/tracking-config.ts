import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { productAnalyticsTrackingConfigTable } from "@/server/db/schema";
import { PA_EVENT_NAMES, type PaEventName, isPaEventName } from "@/lib/pa-whitelist";

const ROW_ID = "default";
const CACHE_TTL_MS = 8000;

let cache: { disabled: Set<string>; at: number } | null = null;

export function invalidateProductAnalyticsTrackingConfigCache() {
  cache = null;
}

function parseDisabledJson(raw: string): Set<string> {
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string" && isPaEventName(x)));
  } catch {
    return new Set();
  }
}

export async function getDisabledPaEventNames(opts?: { bypassCache?: boolean }): Promise<Set<string>> {
  const now = Date.now();
  if (!opts?.bypassCache && cache && now - cache.at < CACHE_TTL_MS) {
    return cache.disabled;
  }

  const rows = await db
    .select({ json: productAnalyticsTrackingConfigTable.disabledEventsJson })
    .from(productAnalyticsTrackingConfigTable)
    .where(eq(productAnalyticsTrackingConfigTable.id, ROW_ID))
    .limit(1);

  const disabled = rows[0] ? parseDisabledJson(rows[0].json) : new Set<string>();
  cache = { disabled, at: now };
  return disabled;
}

export function buildEnabledMap(disabled: Set<string>): Record<PaEventName, boolean> {
  const out = {} as Record<PaEventName, boolean>;
  for (const name of PA_EVENT_NAMES) {
    out[name] = !disabled.has(name);
  }
  return out;
}

export async function getEnabledPaEventMap(): Promise<Record<PaEventName, boolean>> {
  const disabled = await getDisabledPaEventNames();
  return buildEnabledMap(disabled);
}

export async function setDisabledPaEventNames(names: string[]): Promise<void> {
  const unique = Array.from(new Set(names.filter((n) => isPaEventName(n))));
  const json = JSON.stringify(unique);
  await db
    .insert(productAnalyticsTrackingConfigTable)
    .values({
      id: ROW_ID,
      disabledEventsJson: json,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: productAnalyticsTrackingConfigTable.id,
      set: { disabledEventsJson: json, updatedAt: new Date() },
    });
  invalidateProductAnalyticsTrackingConfigCache();
}
