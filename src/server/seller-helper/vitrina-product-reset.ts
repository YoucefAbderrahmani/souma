import { eq } from "drizzle-orm";
import { parseProductContent, serializeProductContent } from "@/lib/product-content";
import {
  VITRINA_MERCH_KEYS,
  VITRINA_QUICK_FIX_INFO_KEYS,
  isVitrinaMerchandisingKey,
} from "@/lib/vitrina-merchandising";
import { db } from "@/server/db";
import { productsTable } from "@/server/db/schema";
import { revalidateStorefrontCatalogPaths } from "@/server/revalidate-storefront-catalog";
import { clearVitrinaRecommendationsCache } from "@/server/seller-helper/vitrina-recommendations-cache";

const STRIP_KEYS = new Set<string>([
  VITRINA_MERCH_KEYS.trendingCountdown,
  VITRINA_MERCH_KEYS.heroReview,
  VITRINA_QUICK_FIX_INFO_KEYS.availability,
  VITRINA_QUICK_FIX_INFO_KEYS.quality,
]);

export function computeVitrinaDefaultReset(product: {
  description: string | null;
  jomlaPrice: number | null;
}): {
  nextDescription: string;
  nextJomlaPrice: null;
  changed: boolean;
} {
  const content = parseProductContent(product.description);
  const nextAdditionalInfo = content.additionalInfo.filter(
    (entry) => !STRIP_KEYS.has(entry.key) && !isVitrinaMerchandisingKey(entry.key)
  );

  const nextDescription = serializeProductContent({
    ...content,
    additionalInfo: nextAdditionalInfo,
  });

  const changed =
    product.jomlaPrice != null || nextDescription !== (product.description ?? "");

  return {
    nextDescription,
    nextJomlaPrice: null,
    changed,
  };
}

/** Store-wide reset of Vitrina quick-fix fields; does not write timeline / activity log rows. */
export async function resetAllVitrinaCatalogToDefaultSilent(): Promise<{
  updatedCount: number;
  message: string;
}> {
  const products = await db
    .select({
      id: productsTable.id,
      description: productsTable.description,
      jomlaPrice: productsTable.jomlaPrice,
    })
    .from(productsTable);

  let updatedCount = 0;
  for (const product of products) {
    const reset = computeVitrinaDefaultReset(product);
    if (!reset.changed) continue;

    await db
      .update(productsTable)
      .set({
        jomlaPrice: reset.nextJomlaPrice,
        description: reset.nextDescription,
      })
      .where(eq(productsTable.id, product.id));
    updatedCount += 1;
  }

  if (updatedCount > 0) {
    revalidateStorefrontCatalogPaths();
  }

  await clearVitrinaRecommendationsCache();

  return {
    updatedCount,
    message:
      updatedCount === 0 ?
        "No Vitrina quick-fix fields were found on catalogue products."
      : `Reset ${updatedCount} product${updatedCount === 1 ? "" : "s"} to default Vitrina merchandising.`,
  };
}
