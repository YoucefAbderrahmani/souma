import { eq, inArray, or, sql } from "drizzle-orm";
import shopData from "@/components/Shop/shopData";
import { normalizeStorefrontProductTitle } from "@/lib/storefront-hidden-products";
import { db } from "@/server/db";
import { categoryTable, productsTable, salesMicroEventTable } from "@/server/db/schema";
import { getStorefrontInventoryAliasIds } from "@/server/data-access/product-catalog";
import { refreshVitrinaRecommendationInCache } from "@/server/seller-helper/vitrina-recommendations-cache";

const POSTGRES_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function microEventTitleMatch(title: string) {
  const normalized = normalizeStorefrontProductTitle(title);
  return sql`lower(trim(regexp_replace(${salesMicroEventTable.productTitle}, '\\s+', ' ', 'g'))) = ${normalized}`;
}

type ProductAnalyticsContext = {
  title: string;
  aliasIds: number[];
  cacheKeys: string[];
};

async function resolveProductAnalyticsContext(productId: string): Promise<ProductAnalyticsContext | null> {
  const id = productId.trim();
  if (!id) return null;

  if (POSTGRES_UUID_RE.test(id)) {
    const [row] = await db
      .select({ id: productsTable.id, title: productsTable.title })
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);
    if (!row) return null;
    const aliasIds = getStorefrontInventoryAliasIds(row.title, row.id);
    return {
      title: row.title,
      aliasIds,
      cacheKeys: [id, ...aliasIds.map(String)],
    };
  }

  const numeric = Number.parseInt(id, 10);
  if (Number.isFinite(numeric) && numeric > 0 && String(numeric) === id) {
    const item = shopData.find((p) => p.id === numeric);
    if (!item) return null;
    return {
      title: item.title,
      aliasIds: [numeric],
      cacheKeys: [id],
    };
  }

  return null;
}

export async function clearVitrinaProductAnalyticsData(productId: string): Promise<{
  ok: boolean;
  deletedCount: number;
  message: string;
}> {
  const context = await resolveProductAnalyticsContext(productId);
  if (!context) {
    return { ok: false, deletedCount: 0, message: "Product not found." };
  }

  const { title, aliasIds, cacheKeys } = context;
  const where =
    aliasIds.length > 0 ?
      or(inArray(salesMicroEventTable.productLocalId, aliasIds), microEventTitleMatch(title))
    : microEventTitleMatch(title);

  const deleted = await db.delete(salesMicroEventTable).where(where).returning({ id: salesMicroEventTable.id });

  await refreshVitrinaRecommendationInCache(productId, cacheKeys);

  const deletedCount = deleted.length;
  return {
    ok: true,
    deletedCount,
    message:
      deletedCount > 0 ?
        `Deleted ${deletedCount.toLocaleString("en-US")} analytics event${deletedCount === 1 ? "" : "s"} for “${title}”. Signals reset — new visits will rebuild recommendations.`
      : `No analytics events were stored for “${title}”. Recommendation card refreshed with empty signals.`,
  };
}
