import { eq, inArray, or, sql } from "drizzle-orm";
import { parseProductContent } from "@/lib/product-content";
import {
  hideStorefrontProductByTitle,
  normalizeStorefrontProductTitle,
} from "@/lib/storefront-hidden-products";
import { db } from "@/server/db";
import {
  assistantSearchTelemetryTable,
  costumer_order_to_productTable,
  imageTable,
  productMediaTable,
  productReviewTable,
  productsTable,
  salesMicroEventTable,
  sellerHelperAppliedActionTable,
  wishlist_to_productTable,
} from "@/server/db/schema";
import { getStorefrontInventoryAliasIds } from "@/server/data-access/product-catalog";
import { removeVitrinaRecommendationsFromCache } from "@/server/seller-helper/vitrina-recommendations-cache";

const MEDIA_ID_IN_TEXT =
  /\/api\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/gi;

function extractMediaIdsFromTexts(...sources: (string | null | undefined)[]): string[] {
  const ids = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    const re = new RegExp(MEDIA_ID_IN_TEXT.source, MEDIA_ID_IN_TEXT.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      const id = match[1]?.toLowerCase();
      if (id) ids.add(id);
    }
  }
  return Array.from(ids);
}

function reviewTitleMatch(title: string) {
  const normalized = normalizeStorefrontProductTitle(title);
  return sql`lower(trim(regexp_replace(${productReviewTable.productTitle}, '\\s+', ' ', 'g'))) = ${normalized}`;
}

function microEventTitleMatch(title: string) {
  const normalized = normalizeStorefrontProductTitle(title);
  return sql`lower(trim(regexp_replace(${salesMicroEventTable.productTitle}, '\\s+', ' ', 'g'))) = ${normalized}`;
}

function appliedActionTitleMatch(title: string) {
  const normalized = normalizeStorefrontProductTitle(title);
  return sql`lower(trim(regexp_replace(${sellerHelperAppliedActionTable.productTitle}, '\\s+', ' ', 'g'))) = ${normalized}`;
}

export type DeleteProductCompletelyResult =
  | { success: true; title: string }
  | { error: string };

/**
 * Permanently removes a catalogue product and all related rows (analytics, reviews,
 * wishlists, order lines, uploaded media). Registers a storefront exclusion so bundled
 * `shopData` seeds with the same title do not reappear after the DB row is gone.
 */
export async function deleteProductCompletely(
  productId: string
): Promise<DeleteProductCompletelyResult> {
  const id = String(productId ?? "").trim();
  if (!id) {
    return { error: "Missing product id." };
  }

  const existing = await db
    .select({
      id: productsTable.id,
      title: productsTable.title,
      mainimage: productsTable.mainimage,
      description: productsTable.description,
    })
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  const row = existing[0];
  if (!row) {
    return { error: "Product not found." };
  }

  const title = row.title.trim();
  const localIds = getStorefrontInventoryAliasIds(title, row.id);
  const mediaIds = extractMediaIdsFromTexts(
    row.mainimage,
    row.description,
    ...(() => {
      try {
        const parsed = parseProductContent(row.description);
        return parsed.colors.map((c) => c.imageUrl);
      } catch {
        return [];
      }
    })()
  );

  const vitrinaCacheKeys = [
    String(localIds[0] ?? ""),
    ...localIds.map(String),
    id,
  ].filter(Boolean);

  try {
    await db.transaction(async (tx) => {
      await tx.delete(imageTable).where(eq(imageTable.productId, id));
      await tx.delete(wishlist_to_productTable).where(eq(wishlist_to_productTable.productId, id));
      await tx
        .delete(costumer_order_to_productTable)
        .where(eq(costumer_order_to_productTable.productId, id));

      if (localIds.length > 0) {
        await tx
          .delete(productReviewTable)
          .where(or(inArray(productReviewTable.productLocalId, localIds), reviewTitleMatch(title)));
        await tx
          .delete(salesMicroEventTable)
          .where(
            or(inArray(salesMicroEventTable.productLocalId, localIds), microEventTitleMatch(title))
          );
        await tx.delete(sellerHelperAppliedActionTable).where(
          or(
            inArray(sellerHelperAppliedActionTable.productLocalId, localIds),
            appliedActionTitleMatch(title)
          )
        );
        await tx
          .delete(assistantSearchTelemetryTable)
          .where(inArray(assistantSearchTelemetryTable.clickedProductId, localIds));
      } else {
        await tx.delete(productReviewTable).where(reviewTitleMatch(title));
        await tx.delete(salesMicroEventTable).where(microEventTitleMatch(title));
        await tx.delete(sellerHelperAppliedActionTable).where(appliedActionTitleMatch(title));
      }

      if (mediaIds.length > 0) {
        await tx.delete(productMediaTable).where(inArray(productMediaTable.id, mediaIds));
      }

      await tx.delete(productsTable).where(eq(productsTable.id, id));
    });

    await hideStorefrontProductByTitle(title);
    await removeVitrinaRecommendationsFromCache(vitrinaCacheKeys);

    return { success: true, title };
  } catch (error) {
    console.error("[deleteProductCompletely]", error);
    return {
      error:
        "Could not delete this product completely. Check database permissions or try again.",
    };
  }
}
