import { desc, eq, inArray, max } from "drizzle-orm";
import { db } from "@/server/db";
import { salesMicroEventTable } from "@/server/db/schema";
import type { SalesMicroEventAdminRow, SalesMicroSessionAdmin } from "@/types/sales-micro-analytics";

function compareEventRows(
  a: typeof salesMicroEventTable.$inferSelect,
  b: typeof salesMicroEventTable.$inferSelect
): number {
  const ta = (a.clientEventAt ?? a.createdAt).getTime();
  const tb = (b.clientEventAt ?? b.createdAt).getTime();
  if (ta !== tb) return ta - tb;
  const sa = a.sequenceIndex ?? 0;
  const sb = b.sequenceIndex ?? 0;
  if (sa !== sb) return sa - sb;
  return a.id.localeCompare(b.id);
}

function parsePayload(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

function toRow(
  row: typeof salesMicroEventTable.$inferSelect,
  deltaMsSincePrevious: number | null,
  msSinceSessionStart: number
): SalesMicroEventAdminRow {
  return {
    id: row.id,
    sessionKey: row.sessionKey,
    userId: row.userId,
    productLocalId: row.productLocalId,
    productTitle: row.productTitle,
    pagePath: row.pagePath,
    referrer: row.referrer,
    eventName: row.eventName,
    payload: parsePayload(row.payloadJson),
    clientEventAt: row.clientEventAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    sequenceIndex: row.sequenceIndex,
    deltaMsSincePrevious,
    msSinceSessionStart,
  };
}

function fmtMs(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.round(ms);
}

/**
 * Latest N distinct browser sessions (by last activity), each with all micro-events
 * ordered in time and enriched with deltas for admin analytics.
 */
export async function listSalesMicroSessionsForAdmin(options?: {
  maxSessions?: number;
}): Promise<SalesMicroSessionAdmin[]> {
  const maxSessions = Math.min(200, Math.max(1, options?.maxSessions ?? 80));

  const sessionAgg = await db
    .select({
      sessionKey: salesMicroEventTable.sessionKey,
      lastAt: max(salesMicroEventTable.createdAt),
    })
    .from(salesMicroEventTable)
    .groupBy(salesMicroEventTable.sessionKey)
    .orderBy(desc(max(salesMicroEventTable.createdAt)))
    .limit(maxSessions);

  const keys = sessionAgg.map((s) => s.sessionKey).filter(Boolean);
  if (keys.length === 0) return [];

  const allRows = await db
    .select()
    .from(salesMicroEventTable)
    .where(inArray(salesMicroEventTable.sessionKey, keys));

  const bySession = new Map<string, typeof allRows>();
  for (const r of allRows) {
    const list = bySession.get(r.sessionKey) ?? [];
    list.push(r);
    bySession.set(r.sessionKey, list);
  }

  const orderSessions = [...keys];
  const sessions: SalesMicroSessionAdmin[] = [];

  for (const sessionKey of orderSessions) {
    const list = bySession.get(sessionKey);
    if (!list?.length) continue;

    list.sort(compareEventRows);

    const t0 =
      (list[0].clientEventAt ?? list[0].createdAt).getTime();

    const events: SalesMicroEventAdminRow[] = [];
    let prevT = t0;

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const t = (r.clientEventAt ?? r.createdAt).getTime();
      const deltaMsSincePrevious = i === 0 ? null : fmtMs(t - prevT);
      const msSinceSessionStart = fmtMs(t - t0);
      events.push(toRow(r, deltaMsSincePrevious, msSinceSessionStart));
      prevT = t;
    }

    const first = list[0];
    const last = list[list.length - 1];
    const firstT = (first.clientEventAt ?? first.createdAt).getTime();
    const lastT = (last.clientEventAt ?? last.createdAt).getTime();

    sessions.push({
      sessionKey,
      userId: list.find((x) => x.userId)?.userId ?? null,
      firstEventAt: (first.clientEventAt ?? first.createdAt).toISOString(),
      lastEventAt: (last.clientEventAt ?? last.createdAt).toISOString(),
      eventCount: list.length,
      sessionDurationMs: fmtMs(lastT - firstT),
      events,
    });
  }

  return sessions;
}

/** Single session (e.g. deep link) — same row shape as in list. */
export async function listSalesMicroEventsForSession(sessionKey: string): Promise<SalesMicroSessionAdmin | null> {
  const key = sessionKey.trim();
  if (key.length < 8) return null;

  const list = await db
    .select()
    .from(salesMicroEventTable)
    .where(eq(salesMicroEventTable.sessionKey, key.slice(0, 64)));

  if (!list.length) return null;

  list.sort(compareEventRows);

  const t0 = (list[0].clientEventAt ?? list[0].createdAt).getTime();
  const events: SalesMicroEventAdminRow[] = [];
  let prevT = t0;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const t = (r.clientEventAt ?? r.createdAt).getTime();
    const deltaMsSincePrevious = i === 0 ? null : fmtMs(t - prevT);
    const msSinceSessionStart = fmtMs(t - t0);
    events.push(toRow(r, deltaMsSincePrevious, msSinceSessionStart));
    prevT = t;
  }

  const first = list[0];
  const last = list[list.length - 1];
  const firstT = (first.clientEventAt ?? first.createdAt).getTime();
  const lastT = (last.clientEventAt ?? last.createdAt).getTime();

  return {
    sessionKey: key.slice(0, 64),
    userId: list.find((x) => x.userId)?.userId ?? null,
    firstEventAt: (first.clientEventAt ?? first.createdAt).toISOString(),
    lastEventAt: (last.clientEventAt ?? last.createdAt).toISOString(),
    eventCount: list.length,
    sessionDurationMs: fmtMs(lastT - firstT),
    events,
  };
}
