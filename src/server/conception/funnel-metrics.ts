import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { STORE_EVENT } from "@/server/conception/event-contract";

export type FunnelCounts = {
  nProduct: number;
  nCart: number;
  nCheckoutPath: number;
  nFinal: number;
};

/**
 * Per-session funnel flags (7d window by default).
 * Steps are independent counts (not nested joins) so listing → cart → checkout is tracked
 * even when the user never opened a product detail page.
 */
export async function funnelCounts(since: Date, until?: Date): Promise<FunnelCounts> {
  const res =
    until ?
      await db.execute(sql`
        WITH flags AS (
          SELECT
            session_key,
            BOOL_OR(event_name = ${STORE_EVENT.productView}) AS has_product,
            BOOL_OR(event_name = ${STORE_EVENT.addToCart}) AS has_cart,
            BOOL_OR(
              event_name = ${STORE_EVENT.beginCheckout}
              OR event_name = 'pa_checkout_step'
              OR event_name = 'pa_abandon_checkout'
              OR event_name = 'pa_payment_failed'
              OR lower(page_path) LIKE '%checkout%'
            ) AS has_checkout,
            BOOL_OR(event_name = ${STORE_EVENT.purchase}) AS has_purchase
          FROM sales_micro_event
          WHERE created_at >= ${since} AND created_at < ${until}
          GROUP BY session_key
        )
        SELECT
          COUNT(*) FILTER (WHERE has_product)::int AS n_product,
          COUNT(*) FILTER (WHERE has_cart)::int AS n_cart,
          COUNT(*) FILTER (WHERE has_checkout)::int AS n_checkout_path,
          COUNT(*) FILTER (WHERE has_purchase)::int AS n_final
        FROM flags
      `)
    : await db.execute(sql`
        WITH flags AS (
          SELECT
            session_key,
            BOOL_OR(event_name = ${STORE_EVENT.productView}) AS has_product,
            BOOL_OR(event_name = ${STORE_EVENT.addToCart}) AS has_cart,
            BOOL_OR(
              event_name = ${STORE_EVENT.beginCheckout}
              OR event_name = 'pa_checkout_step'
              OR event_name = 'pa_abandon_checkout'
              OR event_name = 'pa_payment_failed'
              OR lower(page_path) LIKE '%checkout%'
            ) AS has_checkout,
            BOOL_OR(event_name = ${STORE_EVENT.purchase}) AS has_purchase
          FROM sales_micro_event
          WHERE created_at >= ${since}
          GROUP BY session_key
        )
        SELECT
          COUNT(*) FILTER (WHERE has_product)::int AS n_product,
          COUNT(*) FILTER (WHERE has_cart)::int AS n_cart,
          COUNT(*) FILTER (WHERE has_checkout)::int AS n_checkout_path,
          COUNT(*) FILTER (WHERE has_purchase)::int AS n_final
        FROM flags
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
