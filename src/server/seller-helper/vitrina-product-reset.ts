import { eq } from "drizzle-orm";
import {
  additionalInfoHasVitrinaHeroOrStripContent,
  isVitrinaQuickFixAdditionalInfoEntry,
} from "@/lib/vitrina-merchandising";
import {
  isStructuredProductContent,
  parseProductContent,
  serializeProductContent,
  type ProductStructuredContent,
} from "@/lib/product-content";
import { db } from "@/server/db";
import { productsTable } from "@/server/db/schema";
import { revalidateStorefrontCatalogPaths } from "@/server/revalidate-storefront-catalog";
import { clearVitrinaRecommendationsCache } from "@/server/seller-helper/vitrina-recommendations-cache";

export function stripVitrinaQuickFixFromStructuredContent(
  content: ProductStructuredContent,
  options?: { suppressLiveHeroAfterStrip?: boolean }
): { content: ProductStructuredContent; contentChanged: boolean } {
  const nextAdditionalInfo = content.additionalInfo.filter(
    (entry) => !isVitrinaQuickFixAdditionalInfoEntry(entry)
  );

  const hadVitrinaEntries = nextAdditionalInfo.length !== content.additionalInfo.length;
  const hadHeroStrip = additionalInfoHasVitrinaHeroOrStripContent(content.additionalInfo);
  const suppressLiveHero =
    options?.suppressLiveHeroAfterStrip !== false &&
    (hadHeroStrip || Boolean(content.suppressLiveHeroReviewOverlay));

  const contentChanged =
    hadVitrinaEntries ||
    (suppressLiveHero && !content.suppressLiveHeroReviewOverlay) ||
    (content.suppressLiveHeroReviewOverlay && !suppressLiveHero);

  if (!contentChanged) {
    return { content, contentChanged: false };
  }

  const next: ProductStructuredContent = {
    ...content,
    additionalInfo: nextAdditionalInfo,
  };

  if (suppressLiveHero) {
    next.suppressLiveHeroReviewOverlay = true;
  } else {
    delete next.suppressLiveHeroReviewOverlay;
  }

  return { content: next, contentChanged: true };
}

export function computeVitrinaDefaultReset(product: {
  description: string | null;
  jomlaPrice: number | null;
}): {
  nextDescription: string;
  nextJomlaPrice: null;
  changed: boolean;
} {
  const raw = product.description ?? "";
  const jomlaChanged = product.jomlaPrice != null;

  if (!isStructuredProductContent(raw)) {
    return {
      nextDescription: raw,
      nextJomlaPrice: null,
      changed: jomlaChanged,
    };
  }

  const parsed = parseProductContent(raw);
  const { content, contentChanged } = stripVitrinaQuickFixFromStructuredContent(parsed, {
    suppressLiveHeroAfterStrip: true,
  });

  const nextDescription = serializeProductContent(content);
  const changed = jomlaChanged || contentChanged || nextDescription !== raw;

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
      : `Reset ${updatedCount} product${updatedCount === 1 ? "" : "s"}: removed promo prices, countdowns, review/quality strips, and related overlays.`,
  };
}
