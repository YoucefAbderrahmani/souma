import { sql } from "drizzle-orm";
import { db } from "@/server/db";
export type FunnelCounts = {
  nProduct: number;
  nCart: number;
  nCheckoutPath: number;
  nFinal: number;
};

/** Funnel page-visit events (one row per landing; not deduped by session). */
export const FUNNEL_PAGE_EVENTS = {
  productPage: "pa_funnel_product_page",
  cartPage: "pa_funnel_cart_page",
  checkoutPage: "pa_funnel_checkout_page",
  orderComplete: "pa_funnel_order_complete",
} as const;

/**
 * Counts page visits / step events in a time window (total occurrences, not distinct sessions).
 */
export async function funnelCounts(since: Date, until?: Date): Promise<FunnelCounts> {
  const rowTimeFilter =
    until ?
      sql`sales_micro_event.created_at >= ${since} AND sales_micro_event.created_at < ${until}`
    : sql`sales_micro_event.created_at >= ${since}`;
  const res = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE event_name = ${FUNNEL_PAGE_EVENTS.productPage})::int AS n_product,
      COUNT(*) FILTER (WHERE event_name = ${FUNNEL_PAGE_EVENTS.cartPage})::int AS n_cart,
      COUNT(*) FILTER (WHERE event_name = ${FUNNEL_PAGE_EVENTS.checkoutPage})::int AS n_checkout_path,
      COUNT(*) FILTER (WHERE event_name = ${FUNNEL_PAGE_EVENTS.orderComplete})::int AS n_final
    FROM sales_micro_event
    WHERE ${rowTimeFilter}
  `);

  const row = res.rows[0] as
    | {
        n_product: unknown;
        n_cart: unknown;
        n_checkout_path: unknown;
        n_final: unknown;
      }
    | undefined;

  return {
    nProduct: Number(row?.n_product ?? 0),
    nCart: Number(row?.n_cart ?? 0),
    nCheckoutPath: Number(row?.n_checkout_path ?? 0),
    nFinal: Number(row?.n_final ?? 0),
  };
}
