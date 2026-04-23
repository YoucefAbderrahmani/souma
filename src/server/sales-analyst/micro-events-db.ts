import { db } from "@/server/db";
import { salesMicroEventTable } from "@/server/db/schema";

export type SalesMicroEventRowInput = {
  sessionKey: string;
  userId: string | null;
  productLocalId: number | null;
  productTitle: string | null;
  pagePath: string;
  referrer: string | null;
  eventName: string;
  payload: Record<string, unknown> | null;
  clientEventAt: Date | null;
  sequenceIndex: number;
};

function safePath(path: string, max = 500) {
  const t = path.trim();
  if (!t) return "/";
  return t.length > max ? t.slice(0, max) : t;
}

export async function insertSalesMicroEvents(rows: SalesMicroEventRowInput[]) {
  if (rows.length === 0) return;
  await db.insert(salesMicroEventTable).values(
    rows.map((r) => ({
      sessionKey: r.sessionKey.slice(0, 64),
      userId: r.userId,
      productLocalId: r.productLocalId ?? null,
      productTitle: r.productTitle ? r.productTitle.slice(0, 2000) : null,
      pagePath: safePath(r.pagePath, 512),
      referrer: r.referrer ? r.referrer.slice(0, 2000) : null,
      eventName: r.eventName.slice(0, 80),
      payloadJson: r.payload ? JSON.stringify(r.payload).slice(0, 12000) : null,
      clientEventAt: r.clientEventAt,
      sequenceIndex: Math.max(0, Math.min(10_000, r.sequenceIndex)),
    }))
  );
}
