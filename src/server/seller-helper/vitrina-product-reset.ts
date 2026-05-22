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
import { loadEarliestVitrinaChokepointsByProductDbId } from "@/server/seller-helper/vitrina-chokepoint";

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

/**
 * After a catalog revert, strip any remaining Vitrina rows and block live DB review
 * hero injection (otherwise products with storefront reviews keep showing the banner).
 */
export function finalizeDescriptionAfterVitrinaCatalogReset(raw: string): string {
  const parsed = parseProductContent(raw ?? "");
  const { content } = stripVitrinaQuickFixFromStructuredContent(parsed, {
    suppressLiveHeroAfterStrip: true,
  });
  content.suppressLiveHeroReviewOverlay = true;
  return serializeProductContent(content);
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

function normalizeTitleKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Clear `suppressLiveHeroReviewOverlay` so live/persisted hero review strips can show again. */
export async function clearSuppressLiveHeroReviewOverlayForTitles(titles: string[]): Promise<{
  updatedCount: number;
  matchedTitles: string[];
}> {
  const wanted = new Set(titles.map(normalizeTitleKey).filter(Boolean));
  if (wanted.size === 0) {
    return { updatedCount: 0, matchedTitles: [] };
  }

  const products = await db
    .select({
      id: productsTable.id,
      title: productsTable.title,
      description: productsTable.description,
    })
    .from(productsTable);

  let updatedCount = 0;
  const matchedTitles: string[] = [];

  for (const product of products) {
    if (!wanted.has(normalizeTitleKey(product.title))) continue;
    matchedTitles.push(product.title);

    const raw = product.description ?? "";
    if (!isStructuredProductContent(raw)) continue;

    const parsed = parseProductContent(raw);
    if (!parsed.suppressLiveHeroReviewOverlay) continue;

    const nextContent = { ...parsed };
    delete nextContent.suppressLiveHeroReviewOverlay;
    const next = serializeProductContent(nextContent);
    if (next === raw) continue;

    await db
      .update(productsTable)
      .set({ description: next })
      .where(eq(productsTable.id, product.id));
    updatedCount += 1;
  }

  if (updatedCount > 0) {
    revalidateStorefrontCatalogPaths();
  }

  return { updatedCount, matchedTitles };
}

/** Reset Vitrina quick-fix fields for specific catalogue titles (no timeline log). */
export async function resetVitrinaForProductTitlesSilent(titles: string[]): Promise<{
  updatedCount: number;
  matchedTitles: string[];
  message: string;
}> {
  const wanted = new Set(titles.map(normalizeTitleKey).filter(Boolean));
  if (wanted.size === 0) {
    return { updatedCount: 0, matchedTitles: [], message: "No product titles specified." };
  }

  const earliestChokepoints = await loadEarliestVitrinaChokepointsByProductDbId();

  const products = await db
    .select({
      id: productsTable.id,
      title: productsTable.title,
      description: productsTable.description,
      jomlaPrice: productsTable.jomlaPrice,
    })
    .from(productsTable);

  const matchedTitles: string[] = [];
  let updatedCount = 0;

  for (const product of products) {
    if (!wanted.has(normalizeTitleKey(product.title))) continue;
    matchedTitles.push(product.title);

    const chokepoint = earliestChokepoints.get(product.id);
    if (chokepoint && catalogRowDiffersFromChokepoint(product, chokepoint)) {
      const finalizedDescription = finalizeDescriptionAfterVitrinaCatalogReset(chokepoint.description);
      await db
        .update(productsTable)
        .set({
          jomlaPrice: chokepoint.jomlaPrice,
          description: finalizedDescription,
        })
        .where(eq(productsTable.id, product.id));
      updatedCount += 1;
      continue;
    }

    const reset = computeVitrinaDefaultReset(product);
    let nextDescription = finalizeDescriptionAfterVitrinaCatalogReset(reset.nextDescription);

    const shouldWrite =
      reset.changed ||
      product.jomlaPrice != null ||
      nextDescription !== (product.description ?? "");

    if (!shouldWrite) continue;

    await db
      .update(productsTable)
      .set({
        jomlaPrice: null,
        description: nextDescription,
      })
      .where(eq(productsTable.id, product.id));
    updatedCount += 1;
  }

  if (updatedCount > 0) {
    revalidateStorefrontCatalogPaths();
  }

  return {
    updatedCount,
    matchedTitles,
    message:
      matchedTitles.length === 0 ?
        "No matching products found in the database."
      : updatedCount === 0 ?
        `Found ${matchedTitles.join(", ")}; catalogue rows already had no Vitrina fields (demo overlays removed in code).`
      : `Reset Vitrina merchandising on: ${matchedTitles.join(", ")}.`,
  };
}

function catalogRowDiffersFromChokepoint(
  product: { description: string | null; jomlaPrice: number | null },
  chokepoint: { description: string; jomlaPrice: number | null }
): boolean {
  return (
    (product.description ?? "") !== chokepoint.description ||
    product.jomlaPrice !== chokepoint.jomlaPrice
  );
}

/** Full revert of all Vitrina quick-fix changes (chokepoint restore + strip fallback). No timeline log. */
export async function resetAllVitrinaCatalogToDefaultSilent(): Promise<{
  updatedCount: number;
  chokepointRestoredCount: number;
  strippedCount: number;
  message: string;
}> {
  const earliestChokepoints = await loadEarliestVitrinaChokepointsByProductDbId();

  const products = await db
    .select({
      id: productsTable.id,
      description: productsTable.description,
      jomlaPrice: productsTable.jomlaPrice,
    })
    .from(productsTable);

  let chokepointRestoredCount = 0;
  let strippedCount = 0;

  for (const product of products) {
    const chokepoint = earliestChokepoints.get(product.id);
    let nextDescription = product.description ?? "";
    let nextJomla = product.jomlaPrice;
    let revertKind: "chokepoint" | "strip" | null = null;

    if (chokepoint) {
      if (!catalogRowDiffersFromChokepoint(product, chokepoint)) continue;
      nextDescription = chokepoint.description;
      nextJomla = chokepoint.jomlaPrice;
      revertKind = "chokepoint";
    } else {
      const reset = computeVitrinaDefaultReset(product);
      if (!reset.changed) continue;
      nextDescription = reset.nextDescription;
      nextJomla = reset.nextJomlaPrice;
      revertKind = "strip";
    }

    const finalizedDescription = finalizeDescriptionAfterVitrinaCatalogReset(nextDescription);
    if (
      (product.description ?? "") === finalizedDescription &&
      product.jomlaPrice === nextJomla
    ) {
      continue;
    }

    await db
      .update(productsTable)
      .set({
        jomlaPrice: nextJomla,
        description: finalizedDescription,
      })
      .where(eq(productsTable.id, product.id));

    if (revertKind === "chokepoint") chokepointRestoredCount += 1;
    else strippedCount += 1;
  }

  const updatedCount = chokepointRestoredCount + strippedCount;

  if (updatedCount > 0) {
    revalidateStorefrontCatalogPaths();
  }

  await clearVitrinaRecommendationsCache();

  return {
    updatedCount,
    chokepointRestoredCount,
    strippedCount,
    message:
      updatedCount === 0 ?
        "No Vitrina quick-fix changes were found on catalogue products."
      : `Reverted Vitrina changes on ${updatedCount} product${updatedCount === 1 ? "" : "s"} (${chokepointRestoredCount} full restore from checkpoint, ${strippedCount} stripped).`,
  };
}
