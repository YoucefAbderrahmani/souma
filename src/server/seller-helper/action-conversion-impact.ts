import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { getCatalogProductAliasIds } from "@/server/data-access/product-catalog";
import { STORE_EVENT } from "@/server/conception/event-contract";
import type { AppliedActionConversionImpact } from "@/types/seller-helper-timeline";

const MS_MIN = 15 * 60_000;

function ratePct(purchases: number, views: number): number {
  if (!Number.isFinite(purchases) || !Number.isFinite(views) || views <= 0) return 0;
  return (purchases / views) * 100;
}

async function loadWindowCounts(
  start: Date,
  end: Date,
  productAliasIds: number[] | null
): Promise<{ views: number; purchases: number }> {
  const productFilter =
    productAliasIds && productAliasIds.length > 0 ?
      sql` AND product_local_id IN (${sql.join(
        productAliasIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE event_name = ${STORE_EVENT.productView})::int AS views,
      COUNT(*) FILTER (WHERE event_name = ${STORE_EVENT.purchase})::int AS purchases
    FROM sales_micro_event
    WHERE created_at >= ${start}
      AND created_at < ${end}
      ${productFilter}
  `);

  const row = (result.rows[0] ?? {}) as Record<string, unknown>;
  return {
    views: Number(row.views ?? 0),
    purchases: Number(row.purchases ?? 0),
  };
}

/**
 * Compares conversion in the window after an action vs an equal-length window immediately before it.
 */
export async function computeAppliedActionConversionImpact(options: {
  occurredAt: Date;
  productId: number | null;
}): Promise<AppliedActionConversionImpact> {
  const occurredAt = options.occurredAt;
  const now = new Date();
  const sinceMs = Math.max(MS_MIN, now.getTime() - occurredAt.getTime());
  const sinceStart = occurredAt;
  const sinceEnd = now;
  const beforeEnd = occurredAt;
  const beforeStart = new Date(occurredAt.getTime() - sinceMs);

  let aliasIds: number[] | null = null;
  if (options.productId != null && options.productId > 0) {
    const ids = await getCatalogProductAliasIds(Math.trunc(options.productId));
    aliasIds = ids.length > 0 ? ids : [Math.trunc(options.productId)];
  }

  const [sinceCounts, beforeCounts] = await Promise.all([
    loadWindowCounts(sinceStart, sinceEnd, aliasIds),
    loadWindowCounts(beforeStart, beforeEnd, aliasIds),
  ]);

  const rateSincePct = ratePct(sinceCounts.purchases, sinceCounts.views);
  const rateBeforePct = ratePct(beforeCounts.purchases, beforeCounts.views);
  const deltaPctPoints =
    sinceCounts.views > 0 || beforeCounts.views > 0 ? rateSincePct - rateBeforePct : null;

  const hours = Math.round(sinceMs / 3_600_000);
  const sampleLabel =
    hours < 2 ? "since change (<2h)" : hours < 48 ? `since change (${hours}h)` : `since change (${Math.round(hours / 24)}d)`;

  return {
    viewsSince: sinceCounts.views,
    purchasesSince: sinceCounts.purchases,
    rateSincePct,
    viewsBefore: beforeCounts.views,
    purchasesBefore: beforeCounts.purchases,
    rateBeforePct,
    deltaPctPoints,
    sampleLabel,
  };
}
