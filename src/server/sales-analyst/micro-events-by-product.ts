import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { salesMicroEventTable } from "@/server/db/schema";
import type { SalesMicroEventAdminRow } from "@/types/sales-micro-analytics";
import type {
  ProductMicroAggregateRow,
  ProductMicroDetailResponse,
  ProductMicroEventNameBreakdown,
  ProductMicroSequenceSlice,
} from "@/types/sales-micro-by-product";
import { extractPayloadDurationMs } from "@/lib/sales-micro-payload-duration";
import type { ShoppingSequenceRow } from "@/server/sequence/sequence-db";
import { listSequencesForSessionKeys } from "@/server/sequence/sequence-db";

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

/** Drizzle `sql\`min(timestamp)\`` may return `Date` or ISO `string` depending on driver. */
function aggregateTimestampToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  return new Date(0).toISOString();
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

function meanRounded(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function sequencesBySessionKey(sequences: ShoppingSequenceRow[]): Map<string, ShoppingSequenceRow[]> {
  const bySession = new Map<string, ShoppingSequenceRow[]>();
  for (const s of sequences) {
    const list = bySession.get(s.sessionKey) ?? [];
    list.push(s);
    bySession.set(s.sessionKey, list);
  }
  Array.from(bySession.values()).forEach((list) => {
    list.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  });
  return bySession;
}

/**
 * Shopping funnel row for the product phase: after `product_visited_at`, until `ended_at`
 * (or still active). Counters are scoped to this window; a new sequence starts fresh.
 */
function findProductPhaseSequence(
  ev: SalesMicroEventAdminRow,
  bySession: Map<string, ShoppingSequenceRow[]>
): ShoppingSequenceRow | null {
  const t = new Date(ev.clientEventAt ?? ev.createdAt).getTime();
  const list = bySession.get(ev.sessionKey);
  if (!list?.length) return null;
  let best: ShoppingSequenceRow | null = null;
  for (const s of list) {
    if (!s.productVisitedAt) continue;
    const pv = s.productVisitedAt.getTime();
    if (t < pv) continue;
    const st = s.startedAt.getTime();
    if (t < st) continue;
    const en = s.endedAt ? s.endedAt.getTime() : Number.POSITIVE_INFINITY;
    if (t > en) continue;
    if (!best || s.startedAt.getTime() > best.startedAt.getTime()) best = s;
  }
  return best;
}

function eventTimeMs(ev: SalesMicroEventAdminRow): number {
  return new Date(ev.clientEventAt ?? ev.createdAt).getTime();
}

/** Δ-after-previous along this slice’s own timeline (first row has no Δ). */
function recomputeDeltasOrdered(slice: SalesMicroEventAdminRow[]): SalesMicroEventAdminRow[] {
  const sorted = [...slice].sort((a, b) => eventTimeMs(a) - eventTimeMs(b));
  return sorted.map((cur, i) => {
    const t = eventTimeMs(cur);
    const deltaMsSincePrevious =
      i === 0 ? null : fmtMs(t - eventTimeMs(sorted[i - 1]));
    return { ...cur, deltaMsSincePrevious };
  });
}

function computeSliceStats(slice: SalesMicroEventAdminRow[]): {
  eventCount: number;
  avgPayloadDurationMs: number | null;
  avgDeltaAfterPrevMs: number | null;
  byEventName: Record<string, number>;
  byEventNameDetail: Record<string, ProductMicroEventNameBreakdown>;
} {
  const byEventName: Record<string, number> = {};
  const allDurations: number[] = [];
  const allDeltas: number[] = [];
  const durationsByName = new Map<string, number[]>();
  const deltasByName = new Map<string, number[]>();

  for (const r of slice) {
    byEventName[r.eventName] = (byEventName[r.eventName] ?? 0) + 1;
    const d = extractPayloadDurationMs(r.eventName, r.payload);
    if (d != null) {
      allDurations.push(d);
      const arr = durationsByName.get(r.eventName) ?? [];
      arr.push(d);
      durationsByName.set(r.eventName, arr);
    }
    if (r.deltaMsSincePrevious != null) {
      allDeltas.push(r.deltaMsSincePrevious);
      const arrD = deltasByName.get(r.eventName) ?? [];
      arrD.push(r.deltaMsSincePrevious);
      deltasByName.set(r.eventName, arrD);
    }
  }

  const names = Object.keys(byEventName);
  const byEventNameDetail: Record<string, ProductMicroEventNameBreakdown> = {};
  for (const name of names) {
    byEventNameDetail[name] = {
      count: byEventName[name]!,
      avgPayloadDurationMs: meanRounded(durationsByName.get(name) ?? []),
      avgDeltaAfterPrevMs: meanRounded(deltasByName.get(name) ?? []),
    };
  }

  return {
    eventCount: slice.length,
    avgPayloadDurationMs: meanRounded(allDurations),
    avgDeltaAfterPrevMs: meanRounded(allDeltas),
    byEventName,
    byEventNameDetail,
  };
}

function buildSequenceSlices(
  events: SalesMicroEventAdminRow[],
  sequences: ShoppingSequenceRow[]
): ProductMicroSequenceSlice[] {
  const bySession = sequencesBySessionKey(sequences);
  const eventSessionKeys = new Set(events.map((e) => e.sessionKey));
  const productPhaseRows = sequences.filter(
    (s) => s.productVisitedAt != null && eventSessionKeys.has(s.sessionKey)
  );
  productPhaseRows.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  return productPhaseRows
    .map((s) => {
      const raw = events.filter((ev) => findProductPhaseSequence(ev, bySession)?.id === s.id);
      const sliceEvents = recomputeDeltasOrdered(raw);
      const stats = computeSliceStats(sliceEvents);
      return {
        sequenceId: s.id,
        sessionKey: s.sessionKey,
        triggerType: s.triggerType,
        triggerLabel: s.triggerLabel,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        productVisitedAt: s.productVisitedAt ? s.productVisitedAt.toISOString() : null,
        endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        ...stats,
        events: sliceEvents,
      };
    })
    .filter((slice) => slice.eventCount > 0);
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
    firstEventAt: aggregateTimestampToIso(r.firstEventAt),
    lastEventAt: aggregateTimestampToIso(r.lastEventAt),
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
  const sessionKeys = Array.from(new Set(rows.map((r) => r.sessionKey)));
  const sequenceRows = await listSequencesForSessionKeys(sessionKeys);
  const sequences = buildSequenceSlices(events, sequenceRows);
  return { productLocalId: id, sequences };
}
