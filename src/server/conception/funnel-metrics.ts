import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { STORE_EVENT } from "@/server/conception/event-contract";
import { PA_FUNNEL } from "@/lib/pa-whitelist";

export type FunnelCounts = {
  nProduct: number;
  nCart: number;
  nCheckoutPath: number;
  nFinal: number;
};

/** Funnel telemetry event names. */
export const FUNNEL_PAGE_EVENTS = {
  productPage: "pa_funnel_product_page",
  addToCartClick: "pa_funnel_add_to_cart",
  checkoutPage: "pa_funnel_checkout_page",
  orderComplete: "pa_funnel_order_complete",
} as const;

/**
 * Distinct sessions per funnel step. A later step rolls up to all earlier steps in the
 * same session (e.g. add to cart also counts product if product was not recorded yet).
 */
export async function funnelCounts(since: Date, until?: Date): Promise<FunnelCounts> {
  const timeFilter =
    until ?
      sql`created_at >= ${since} AND created_at < ${until}`
    : sql`created_at >= ${since}`;

  const res =
    until ?
      await db.execute(sql`
        WITH per_session AS (
          SELECT
            session_key,
            BOOL_OR(event_name = ${FUNNEL_PAGE_EVENTS.productPage}) AS hit_product,
            BOOL_OR(
              event_name IN (${FUNNEL_PAGE_EVENTS.addToCartClick}, ${PA_FUNNEL.buyNow})
            ) AS hit_cart,
            BOOL_OR(
              event_name IN (
                ${FUNNEL_PAGE_EVENTS.checkoutPage},
                ${STORE_EVENT.beginCheckout}
              )
            ) AS hit_checkout,
            BOOL_OR(event_name = ${FUNNEL_PAGE_EVENTS.orderComplete}) AS hit_order
          FROM sales_micro_event
          WHERE ${timeFilter}
          GROUP BY session_key
        ),
        rolled AS (
          SELECT
            session_key,
            (hit_product OR hit_cart OR hit_checkout OR hit_order) AS at_product,
            (hit_cart OR hit_checkout OR hit_order) AS at_cart,
            (hit_checkout OR hit_order) AS at_checkout,
            hit_order AS at_order
          FROM per_session
        )
        SELECT
          COUNT(*) FILTER (WHERE at_product)::int AS n_product,
          COUNT(*) FILTER (WHERE at_cart)::int AS n_cart,
          COUNT(*) FILTER (WHERE at_checkout)::int AS n_checkout_path,
          COUNT(*) FILTER (WHERE at_order)::int AS n_final
        FROM rolled
      `)
    : await db.execute(sql`
        WITH per_session AS (
          SELECT
            session_key,
            BOOL_OR(event_name = ${FUNNEL_PAGE_EVENTS.productPage}) AS hit_product,
            BOOL_OR(
              event_name IN (${FUNNEL_PAGE_EVENTS.addToCartClick}, ${PA_FUNNEL.buyNow})
            ) AS hit_cart,
            BOOL_OR(
              event_name IN (
                ${FUNNEL_PAGE_EVENTS.checkoutPage},
                ${STORE_EVENT.beginCheckout}
              )
            ) AS hit_checkout,
            BOOL_OR(event_name = ${FUNNEL_PAGE_EVENTS.orderComplete}) AS hit_order
          FROM sales_micro_event
          WHERE ${timeFilter}
          GROUP BY session_key
        ),
        rolled AS (
          SELECT
            session_key,
            (hit_product OR hit_cart OR hit_checkout OR hit_order) AS at_product,
            (hit_cart OR hit_checkout OR hit_order) AS at_cart,
            (hit_checkout OR hit_order) AS at_checkout,
            hit_order AS at_order
          FROM per_session
        )
        SELECT
          COUNT(*) FILTER (WHERE at_product)::int AS n_product,
          COUNT(*) FILTER (WHERE at_cart)::int AS n_cart,
          COUNT(*) FILTER (WHERE at_checkout)::int AS n_checkout_path,
          COUNT(*) FILTER (WHERE at_order)::int AS n_final
        FROM rolled
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
