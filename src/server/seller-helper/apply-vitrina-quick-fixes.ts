import { eq } from "drizzle-orm";
import {
  buildHeroReviewSnippetFromVerifiedReview,
  buildTrendingCountdownEnd,
  readPromoStartedAt,
  VITRINA_MERCH_KEYS,
  VITRINA_QUICK_FIX_INFO_KEYS,
} from "@/lib/vitrina-merchandising";
import {
  getProductSizeOptions,
  parseProductContent,
  type ProductSizeOption,
  serializeProductContent,
} from "@/lib/product-content";
import { db } from "@/server/db";
import { productsTable } from "@/server/db/schema";
import {
  getStorefrontInventoryAliasIds,
  resolveDatabaseProductIdFromClientProductId,
} from "@/server/data-access/product-catalog";
import { logAppliedAction } from "@/server/seller-helper/applied-actions";
import { revalidateStorefrontCatalogPaths } from "@/server/revalidate-storefront-catalog";
import { refreshVitrinaRecommendationInCache } from "@/server/seller-helper/vitrina-recommendations-cache";
import { getBestProductReviewsForMerchByLocalIds } from "@/server/reviews/reviews-db";
import { clampVitrinaFixesPerItem, DEFAULT_VITRINA_FIXES_PER_ITEM } from "@/lib/vitrina-fixes-per-item";
import type { VitrinaQuickFixId, VitrinaQuickFixOption } from "@/types/vitrina-product-recommendations";
import { getVitrinaProductMarketingRecommendationByProductId } from "@/server/seller-helper/product-marketing-recommendations";

const VITRINA_STANDARD_MARKUP = 0.2;
const QUICK_FIX_IDS = new Set<VitrinaQuickFixId>([
  "default_color",
  "default_size",
  "promo_price",
  "availability_note",
  "quality_highlight",
  "trending_countdown",
  "promo_catalog_boost",
  "hero_review_snippet",
]);

function upsertAdditionalInfo(
  entries: Array<{ key: string; value: string }>,
  key: string,
  value: string
) {
  const next = entries.filter((entry) => entry.key !== key);
  next.push({ key, value });
  return next;
}

function reorderDefaultColor(
  colors: Array<{ name: string; price?: number; inStock?: boolean; imageUrl?: string }>,
  colorName: string
) {
  const normalized = colorName.trim().toLowerCase();
  if (!normalized) return colors;

  const index = colors.findIndex((color) => color.name.trim().toLowerCase() === normalized);
  if (index <= 0) return colors;

  const reordered = [...colors];
  const [match] = reordered.splice(index, 1);
  return [match, ...reordered];
}

function reorderDefaultSize(sizes: ProductSizeOption[], sizeLabel: string) {
  const normalized = sizeLabel.trim().toLowerCase();
  if (!normalized) return sizes;

  const index = sizes.findIndex((size) => size.label.trim().toLowerCase() === normalized);
  if (index <= 0) return sizes;

  const reordered = [...sizes];
  const [match] = reordered.splice(index, 1);
  return [match, ...reordered];
}

/** Top verified review line — only used when applying the Quality & reviews quick fix. */
async function heroSnippetFromBestVerifiedReview(
  productDbId: string,
  productTitle: string
): Promise<string | null> {
  const aliasIds = getStorefrontInventoryAliasIds(productTitle, productDbId);
  try {
    const bestById = await getBestProductReviewsForMerchByLocalIds(aliasIds);
    for (const localId of aliasIds) {
      const best = bestById.get(localId);
      if (best?.comment?.trim()) {
        return buildHeroReviewSnippetFromVerifiedReview(best);
      }
    }
  } catch {
    return null;
  }

  return null;
}

function enrichRequestedQuickFix(
  requested: VitrinaQuickFixOption,
  catalog?: VitrinaQuickFixOption
): VitrinaQuickFixOption | null {
  const label = requested.label?.trim() || catalog?.label || requested.id;
  const summary = requested.summary?.trim() || catalog?.summary || label;

  if (requested.id === "default_color") {
    const color = requested.context?.color?.trim() || catalog?.context?.color?.trim();
    if (!color) return catalog ?? null;
    return {
      id: "default_color",
      label,
      summary,
      context: { color },
    };
  }

  if (requested.id === "default_size") {
    const size = requested.context?.size?.trim() || catalog?.context?.size?.trim();
    if (!size) return catalog ?? null;
    return {
      id: "default_size",
      label,
      summary,
      context: { size },
    };
  }

  if (catalog) {
    return {
      ...catalog,
      label,
      summary,
      context: { ...catalog.context, ...requested.context },
    };
  }

  return {
    id: requested.id,
    label,
    summary,
    ...(requested.context ? { context: requested.context } : {}),
  };
}

function isQuickFixId(value: unknown): value is VitrinaQuickFixId {
  return typeof value === "string" && QUICK_FIX_IDS.has(value as VitrinaQuickFixId);
}

function normalizeSubmittedQuickFix(value: unknown): VitrinaQuickFixOption | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as {
    id?: unknown;
    label?: unknown;
    summary?: unknown;
    context?: { color?: unknown; size?: unknown };
  };

  if (!isQuickFixId(candidate.id)) return null;

  const label = String(candidate.label ?? "").trim();
  const summary = String(candidate.summary ?? "").trim();
  if (!label || !summary) return null;

  const color = String(candidate.context?.color ?? "").trim();
  const size = String(candidate.context?.size ?? "").trim();
  return {
    id: candidate.id,
    label,
    summary,
    ...(color || size ?
      {
        context: {
          ...(color ? { color } : {}),
          ...(size ? { size } : {}),
        },
      }
    : {}),
  };
}

export function parseSubmittedVitrinaQuickFixes(
  rawFixes: string,
  rawFixIds: string,
  fixesPerItem: number = DEFAULT_VITRINA_FIXES_PER_ITEM
): VitrinaQuickFixOption[] {
  const maxFixes = clampVitrinaFixesPerItem(fixesPerItem);
  const submitted: VitrinaQuickFixOption[] = [];

  if (rawFixes.trim()) {
    const parsed = JSON.parse(rawFixes) as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const fix = normalizeSubmittedQuickFix(item);
        if (fix) submitted.push(fix);
      }
    }
  }

  if (submitted.length > 0) {
    return submitted.slice(0, maxFixes);
  }

  const requestedFixIds = JSON.parse(rawFixIds) as unknown;
  if (!Array.isArray(requestedFixIds)) {
    return [];
  }

  return requestedFixIds
    .filter((id): id is VitrinaQuickFixId => isQuickFixId(id))
    .map((id) => ({
      id,
      label: id,
      summary: id,
    }))
    .slice(0, maxFixes);
}

export async function resolveVitrinaQuickFixes(
  productId: string,
  requestedFixes: VitrinaQuickFixOption[],
  fixesPerItem: number = DEFAULT_VITRINA_FIXES_PER_ITEM
): Promise<{ fixes: VitrinaQuickFixOption[]; error?: string }> {
  const maxFixes = clampVitrinaFixesPerItem(fixesPerItem);
  if (requestedFixes.length === 0) {
    return { fixes: [], error: "No quick fixes selected." };
  }

  const recommendation = await getVitrinaProductMarketingRecommendationByProductId(productId);
  const allowed = new Map((recommendation?.quickFixes ?? []).map((fix) => [fix.id, fix]));

  const fixes = requestedFixes
    .filter((requested) => isQuickFixId(requested.id))
    .map((requested) => enrichRequestedQuickFix(requested, allowed.get(requested.id)))
    .filter((fix): fix is VitrinaQuickFixOption => Boolean(fix))
    .slice(0, maxFixes);

  if (fixes.length === 0) {
    return { fixes: [], error: "No quick fixes are available for this product." };
  }

  return { fixes };
}

export async function applyVitrinaQuickFixes(
  productId: string,
  fixes: VitrinaQuickFixOption[]
): Promise<{ applied: string[]; error?: string }> {
  if (fixes.length === 0) {
    return { applied: [], error: "No quick fixes selected." };
  }

  const clientProductId = productId.trim();
  const dbProductId = await resolveDatabaseProductIdFromClientProductId(clientProductId);
  if (!dbProductId) {
    return {
      applied: [],
      error:
        "Could not resolve or create a database product for this listing. Check that Postgres is reachable, migrations are applied, and try again.",
    };
  }

  const [product] = await db
    .select({
      id: productsTable.id,
      title: productsTable.title,
      price: productsTable.price,
      jomlaPrice: productsTable.jomlaPrice,
      instock: productsTable.instock,
      rating: productsTable.rating,
      description: productsTable.description,
    })
    .from(productsTable)
    .where(eq(productsTable.id, dbProductId))
    .limit(1);

  if (!product) {
    return { applied: [], error: "Product not found." };
  }

  const chokepointBefore = {
    jomlaPrice: product.jomlaPrice,
    description: product.description,
  };

  const content = parseProductContent(product.description);
  let nextPrice = product.price;
  let nextJomlaPrice = product.jomlaPrice;
  let nextColors = content.colors;
  let nextSizes = content.sizes ?? [];
  let nextAdditionalInfo = content.additionalInfo;
  let nextDescription = product.description;
  let contentChanged = false;
  const applied: string[] = [];

  for (const fix of fixes) {
    if (fix.id === "default_color") {
      const colorName = fix.context?.color?.trim();
      if (!colorName) continue;
      const colorIndex = nextColors.findIndex(
        (color) => color.name.trim().toLowerCase() === colorName.toLowerCase()
      );
      if (colorIndex > 0) {
        nextColors = reorderDefaultColor(nextColors, colorName);
        contentChanged = true;
        applied.push(fix.summary);
      } else if (colorIndex === 0) {
        applied.push(fix.summary);
      }
      continue;
    }

    if (fix.id === "default_size") {
      const sizeLabel = fix.context?.size?.trim();
      if (!sizeLabel || !content.sizesEnabled) continue;
      const sizeOptions = getProductSizeOptions(content);
      const sizeIndex = sizeOptions.findIndex(
        (size) => size.label.trim().toLowerCase() === sizeLabel.toLowerCase()
      );
      if (sizeIndex > 0) {
        nextSizes = reorderDefaultSize(sizeOptions, sizeLabel);
        contentChanged = true;
        applied.push(fix.summary);
      } else if (sizeIndex === 0) {
        applied.push(fix.summary);
      }
      continue;
    }

    if (fix.id === "promo_price" && nextJomlaPrice == null) {
      const vitrinaPrice = Math.max(1, Math.round(nextPrice / (1 + VITRINA_STANDARD_MARKUP)));
      nextJomlaPrice = vitrinaPrice;
      if (!readPromoStartedAt(nextAdditionalInfo)) {
        nextAdditionalInfo = upsertAdditionalInfo(
          nextAdditionalInfo,
          VITRINA_MERCH_KEYS.promoStartedAt,
          new Date().toISOString()
        );
        contentChanged = true;
      }
      applied.push(fix.summary);
      continue;
    }

    if (fix.id === "promo_catalog_boost") {
      const boostAt = new Date().toISOString();
      nextAdditionalInfo = upsertAdditionalInfo(
        nextAdditionalInfo,
        VITRINA_MERCH_KEYS.catalogBoost,
        boostAt
      );
      contentChanged = true;
      applied.push(fix.summary);
      continue;
    }

    if (fix.id === "availability_note" && product.instock > 0) {
      const availabilityValue = `In stock — ${product.instock} unit${product.instock === 1 ? "" : "s"} ready to ship.`;
      const existing = nextAdditionalInfo.find((entry) => entry.key === VITRINA_QUICK_FIX_INFO_KEYS.availability);
      if (existing?.value === availabilityValue) {
        applied.push(fix.summary);
        continue;
      }
      nextAdditionalInfo = upsertAdditionalInfo(
        nextAdditionalInfo,
        VITRINA_QUICK_FIX_INFO_KEYS.availability,
        availabilityValue
      );
      contentChanged = true;
      applied.push(fix.summary);
      continue;
    }

    if (fix.id === "quality_highlight") {
      const ratingLabel =
        product.rating > 0 ?
          `Customer rating ${product.rating.toFixed(1)}/5 — review quality before you buy.`
        : "Check customer reviews and product details before you buy.";

      nextAdditionalInfo = upsertAdditionalInfo(
        nextAdditionalInfo,
        VITRINA_QUICK_FIX_INFO_KEYS.quality,
        ratingLabel
      );

      const heroSnippet = await heroSnippetFromBestVerifiedReview(product.id, product.title);
      if (heroSnippet) {
        nextAdditionalInfo = upsertAdditionalInfo(
          nextAdditionalInfo,
          VITRINA_MERCH_KEYS.heroReview,
          heroSnippet
        );
      } else {
        nextAdditionalInfo = nextAdditionalInfo.filter(
          (entry) => entry.key !== VITRINA_MERCH_KEYS.heroReview
        );
      }

      contentChanged = true;

      applied.push(
        heroSnippet ?
          fix.summary
        : `${fix.summary} (Quality line saved; add a written storefront review for a quote on the hero image.)`
      );
      continue;
    }

    if (fix.id === "trending_countdown") {
      const countdownValue = buildTrendingCountdownEnd();
      const existing = nextAdditionalInfo.find((entry) => entry.key === VITRINA_MERCH_KEYS.trendingCountdown);
      if (existing?.value === countdownValue) {
        applied.push(fix.summary);
        continue;
      }
      nextAdditionalInfo = upsertAdditionalInfo(
        nextAdditionalInfo,
        VITRINA_MERCH_KEYS.trendingCountdown,
        countdownValue
      );
      contentChanged = true;
      applied.push(fix.summary);
      continue;
    }

    if (fix.id === "hero_review_snippet") {
      const snippet = await heroSnippetFromBestVerifiedReview(product.id, product.title);
      if (!snippet) {
        applied.push("Hero review overlay skipped — add a written storefront review first.");
        continue;
      }
      const existing = nextAdditionalInfo.find((entry) => entry.key === VITRINA_MERCH_KEYS.heroReview);
      if (existing?.value === snippet) {
        applied.push(fix.summary);
        continue;
      }
      nextAdditionalInfo = upsertAdditionalInfo(nextAdditionalInfo, VITRINA_MERCH_KEYS.heroReview, snippet);
      contentChanged = true;
      applied.push(fix.summary);
    }
  }

  if (applied.length === 0) {
    return { applied: [], error: "No quick fixes could be applied." };
  }

  const priceChanged = nextJomlaPrice !== product.jomlaPrice;

  if (contentChanged) {
    const nextContent = {
      ...content,
      colors: nextColors,
      sizes: nextSizes,
      additionalInfo: nextAdditionalInfo,
    };
    delete nextContent.suppressLiveHeroReviewOverlay;
    nextDescription = serializeProductContent(nextContent);
  }

  const storefrontDataChanged = contentChanged || priceChanged;
  if (storefrontDataChanged) {
    await db
      .update(productsTable)
      .set({
        ...(priceChanged ? { jomlaPrice: nextJomlaPrice } : {}),
        ...(contentChanged ? { description: nextDescription } : {}),
      })
      .where(eq(productsTable.id, dbProductId));
    revalidateStorefrontCatalogPaths();
  }

  const aliasIds = getStorefrontInventoryAliasIds(product.title, product.id);
  const storefrontProductId = aliasIds[0] ?? 0;
  const appliedFixIds = fixes
    .map((fix) => fix.id)
    .filter((id, index, all) => all.indexOf(id) === index);
  const summaryLines = applied.join(" • ");
  await logAppliedAction({
    kind: "vitrina_quick_fix",
    title: `Vitrina quick fix · ${product.title}`,
    summary: summaryLines || `${applied.length} quick fix${applied.length === 1 ? "" : "es"} applied`,
    productLocalId: storefrontProductId > 0 ? storefrontProductId : null,
    productTitle: product.title,
    sourceRefId: clientProductId,
    details: {
      chokepointBefore,
      productDbId: dbProductId,
      productLocalId: storefrontProductId,
      productTitle: product.title,
      fixIds: appliedFixIds,
      fixes: fixes.map((fix) => ({
        id: fix.id,
        label: fix.label,
        summary: fix.summary,
        context: fix.context ?? null,
      })),
      appliedSummaries: applied,
      priceChanged,
      contentChanged,
    },
  });

  await refreshVitrinaRecommendationInCache(
    dbProductId,
    clientProductId !== dbProductId ? [clientProductId] : undefined
  );

  return { applied };
}
