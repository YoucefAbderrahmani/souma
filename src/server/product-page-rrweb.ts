import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { productPageRrwebTable } from "@/server/db/schema";

const MAX_STORED_EVENTS = 4000;

function capEvents(events: unknown[]): unknown[] {
  if (events.length <= MAX_STORED_EVENTS) return events;
  return events.slice(events.length - MAX_STORED_EVENTS);
}

export async function appendProductPageRrwebEvents(
  productLocalId: number,
  incoming: unknown[]
): Promise<{ stored: number }> {
  if (incoming.length === 0) return { stored: 0 };

  const existing = await db
    .select({ events: productPageRrwebTable.events })
    .from(productPageRrwebTable)
    .where(eq(productPageRrwebTable.productLocalId, productLocalId))
    .limit(1);

  const prior = existing[0]?.events ?? [];
  const merged = capEvents([...prior, ...incoming]);

  await db
    .insert(productPageRrwebTable)
    .values({
      productLocalId,
      events: merged,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: productPageRrwebTable.productLocalId,
      set: {
        events: merged,
        updatedAt: new Date(),
      },
    });

  return { stored: merged.length };
}

export async function getProductPageRrwebEvents(productLocalId: number) {
  const rows = await db
    .select()
    .from(productPageRrwebTable)
    .where(eq(productPageRrwebTable.productLocalId, productLocalId))
    .limit(1);

  if (!rows[0]) return null;

  return {
    productId: rows[0].productLocalId,
    events: rows[0].events ?? [],
    updatedAt: rows[0].updatedAt,
  };
}
