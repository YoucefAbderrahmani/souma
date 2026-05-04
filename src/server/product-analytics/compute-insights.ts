import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { salesMicroEventTable } from "@/server/db/schema";
import { PA_FUNNEL } from "@/lib/pa-whitelist";

const MS_DAY = 86_400_000;

async function countDistinctSessions(eventName: string, since: Date): Promise<number> {
  const [row] = await db
    .select({
      n: sql<number>`count(distinct ${salesMicroEventTable.sessionKey})::int`.as("n"),
    })
    .from(salesMicroEventTable)
    .where(and(gte(salesMicroEventTable.createdAt, since), eq(salesMicroEventTable.eventName, eventName)));
  return row?.n ?? 0;
}

export type ProductAnalyticsInsightsDto = {
  windowDays: number;
  conversion_rate: number;
  add_to_cart_rate: number;
  abandonment_rate: number;
  sessions_with_view: number;
  sessions_with_cart: number;
  sessions_with_checkout: number;
  sessions_with_purchase: number;
  search_events: number;
  wishlist_events: number;
  computedAt: string;
};

export async function computeProductAnalyticsInsights(
  windowDays = 7
): Promise<ProductAnalyticsInsightsDto> {
  const since = new Date(Date.now() - windowDays * MS_DAY);

  const [v, c, chk, p] = await Promise.all([
    countDistinctSessions(PA_FUNNEL.productView, since),
    countDistinctSessions(PA_FUNNEL.addToCart, since),
    countDistinctSessions(PA_FUNNEL.beginCheckout, since),
    countDistinctSessions(PA_FUNNEL.purchase, since),
  ]);

  const [searchN, wishN] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int`.as("n") })
      .from(salesMicroEventTable)
      .where(and(gte(salesMicroEventTable.createdAt, since), eq(salesMicroEventTable.eventName, "pa_search"))),
    db
      .select({ n: sql<number>`count(*)::int`.as("n") })
      .from(salesMicroEventTable)
      .where(and(gte(salesMicroEventTable.createdAt, since), eq(salesMicroEventTable.eventName, "pa_add_to_wishlist"))),
  ]);

  const conversion_rate = v > 0 ? p / v : 0;
  const add_to_cart_rate = v > 0 ? c / v : 0;
  const abandonment_rate = c > 0 ? 1 - p / c : 0;

  return {
    windowDays,
    conversion_rate,
    add_to_cart_rate,
    abandonment_rate,
    sessions_with_view: v,
    sessions_with_cart: c,
    sessions_with_checkout: chk,
    sessions_with_purchase: p,
    search_events: searchN[0]?.n ?? 0,
    wishlist_events: wishN[0]?.n ?? 0,
    computedAt: new Date().toISOString(),
  };
}
