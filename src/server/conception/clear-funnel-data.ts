import { inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { salesMicroEventTable } from "@/server/db/schema";
import { STORE_EVENT } from "@/server/conception/event-contract";
import { FUNNEL_PAGE_EVENTS } from "@/server/conception/funnel-metrics";

/** Event names that feed the Conversion Funnel tab counts. */
export const FUNNEL_CLEAR_EVENT_NAMES = [
  FUNNEL_PAGE_EVENTS.productPage,
  FUNNEL_PAGE_EVENTS.cartPage,
  FUNNEL_PAGE_EVENTS.checkoutPage,
  STORE_EVENT.purchase,
] as const;

export async function clearConversionFunnelData(): Promise<{
  ok: true;
  deletedCount: number;
  message: string;
}> {
  const deleted = await db
    .delete(salesMicroEventTable)
    .where(inArray(salesMicroEventTable.eventName, [...FUNNEL_CLEAR_EVENT_NAMES]))
    .returning({ id: salesMicroEventTable.id });

  const deletedCount = deleted.length;
  return {
    ok: true,
    deletedCount,
    message:
      deletedCount > 0 ?
        `Cleared ${deletedCount} funnel event(s). All funnel steps are back to 0.`
      : "Funnel was already empty (0 events).",
  };
}
