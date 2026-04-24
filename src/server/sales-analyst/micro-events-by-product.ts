import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { salesMicroEventTable } from "@/server/db/schema";
import type { SalesMicroEventAdminRow } from "@/types/sales-micro-analytics";
import type { ProductMicroAggregateRow, ProductMicroDetailResponse, ProductMicroDetailStats } from "@/types/sales-micro-by-product";
import { extractPayloadDurationMs } from "@/lib/sales-micro-payload-duration";

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

function fmtMs(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.round(ms);
}

/** Per-session ordering, then flatten chronologically for mixed-session product timelines. */
function toAdminRowsForProduct(rows: (typeof salesMicroEventTable.$inferSelect)[]): SalesMicroEventAdminRow[] {
  const bySession = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = bySession.get(r.sessionKey) ?? [];
    list.push(r);
    bySession.set(r.sessionKey, list);
  }
  for (const list of Array.from(bySession.values())) {
    list.sort(compareEventRows);
  }

  const flat: SalesMicroEventAdminRow[] = [];
  for (const list of Array.from(bySession.values())) {
    let prevT = 0;
    let t0 = 0;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const t = (r.clientEventAt ?? r.createdAt).getTime();
      if (i === 0) {
        t0 = t;
        prevT = t;
        flat.push({
          id: r.id,
          sessionKey: r.sessionKey,
          userId: r.userId,
          productLocalId: r.productLocalId,
          productTitle: r.productTitle,
          pagePath: r.pagePath,
          referrer: r.referrer,
          eventName: r.eventName,
          payload: parsePayload(r.payloadJson),
          clientEventAt: r.clientEventAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          sequenceIndex: r.sequenceIndex,
          deltaMsSincePrevious: null,
          msSinceSessionStart: 0,
        });
      } else {
        const deltaMsSincePrevious = fmtMs(t - prevT);
        const msSinceSessionStart = fmtMs(t - t0);
        prevT = t;
        flat.push({
          id: r.id,
          sessionKey: r.sessionKey,
          userId: r.userId,
          productLocalId: r.productLocalId,
          productTitle: r.productTitle,
          pagePath: r.pagePath,
          referrer: r.referrer,
          eventName: r.eventName,
          payload: parsePayload(r.payloadJson),
          clientEventAt: r.clientEventAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          sequenceIndex: r.sequenceIndex,
          deltaMsSincePrevious,
          msSinceSessionStart,
        });
      }
    }
  }

  flat.sort((a, b) => {
    const ta = new Date(a.clientEventAt ?? a.createdAt).getTime();
    const tb = new Date(b.clientEventAt ?? b.createdAt).getTime();
    if (ta !== tb) return ta - tb;
    return a.sessionKey.localeCompare(b.sessionKey);
  });
  return flat;
}

function computeStats(events: SalesMicroEventAdminRow[]): ProductMicroDetailStats {
  const byEventName: Record<string, number> = {};
  const durations: number[] = [];
  const deltas: number[] = [];
  for (const r of events) {
    byEventName[r.eventName] = (byEventName[r.eventName] ?? 0) + 1;
    const d = extractPayloadDurationMs(r.eventName, r.payload);
    if (d != null) durations.push(d);
    if (r.deltaMsSincePrevious != null) deltas.push(r.deltaMsSincePrevious);
  }
  const avgPayloadDurationMs =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  const avgDeltaAfterPrevMs =
    deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;
  return { avgPayloadDurationMs, avgDeltaAfterPrevMs, byEventName };
}

export async function listProductMicroAggregatesAdmin(options?: {
  limit?: number;
}): Promise<ProductMicroAggregateRow[]> {
  const limit = Math.min(250, Math.max(1, options?.limit ?? 150));

  const rows = await db
    .select({
      productLocalId: salesMicroEventTable.productLocalId,
      productTitle: sql<string>`max(coalesce(${salesMicroEventTable.productTitle}, ''))`,
      eventCount: sql<number>`count(*)::int`,
      sessionCount: sql<number>`count(distinct ${salesMicroEventTable.sessionKey})::int`,
      firstEventAt: sql<Date>`min(${salesMicroEventTable.createdAt})`,
      lastEventAt: sql<Date>`max(${salesMicroEventTable.createdAt})`,
    })
    .from(salesMicroEventTable)
    .where(isNotNull(salesMicroEventTable.productLocalId))
    .groupBy(salesMicroEventTable.productLocalId)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(limit);

  return rows.map((r) => ({
    productLocalId: r.productLocalId as number,
    productTitle: r.productTitle?.trim() ? r.productTitle : null,
    eventCount: r.eventCount,
    sessionCount: r.sessionCount,
    firstEventAt: r.firstEventAt.toISOString(),
    lastEventAt: r.lastEventAt.toISOString(),
  }));
}

export async function getProductMicroDetailAdmin(
  productLocalId: number,
  options?: { limit?: number }
): Promise<ProductMicroDetailResponse | null> {
  const id = Math.floor(productLocalId);
  if (!Number.isFinite(id) || id < 1) return null;
  const limit = Math.min(2000, Math.max(1, options?.limit ?? 800));

  const rows = await db
    .select()
    .from(salesMicroEventTable)
    .where(eq(salesMicroEventTable.productLocalId, id))
    .limit(limit);

  if (rows.length === 0) return null;

  const events = toAdminRowsForProduct(rows);
  const stats = computeStats(events);
  return { productLocalId: id, stats, events };
}
