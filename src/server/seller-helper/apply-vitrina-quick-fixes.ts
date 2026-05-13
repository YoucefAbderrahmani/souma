import { eq } from "drizzle-orm";
import {
  buildDefaultHeroReviewSnippet,
  buildTrendingCountdownEnd,
  VITRINA_MERCH_KEYS,
} from "@/lib/vitrina-merchandising";
import { parseProductContent, serializeProductContent } from "@/lib/product-content";
import { db } from "@/server/db";
import { productsTable } from "@/server/db/schema";
import { resolveStorefrontProductId } from "@/server/data-access/product-catalog";
import { logAppliedAction } from "@/server/seller-helper/applied-actions";
import type { VitrinaQuickFixId, VitrinaQuickFixOption } from "@/types/vitrina-product-recommendations";
import { getVitrinaProductMarketingRecommendationByProductId } from "@/server/seller-helper/product-marketing-recommendations";

const VITRINA_STANDARD_MARKUP = 0.2;
const AVAILABILITY_KEY = "Availability";
const QUALITY_KEY = "Quality";
const QUICK_FIX_IDS = new Set<VitrinaQuickFixId>([
  "default_color",
  "promo_price",
  "availability_note",
  "quality_highlight",
  "trending_countdown",
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
  colors: Array<{ name: string; price?: number; inStock?: boolean }>,
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

function isQuickFixId(value: unknown): value is VitrinaQuickFixId {
  return typeof value === "string" && QUICK_FIX_IDS.has(value as VitrinaQuickFixId);
}

function normalizeSubmittedQuickFix(value: unknown): VitrinaQuickFixOption | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as {
    id?: unknown;
    label?: unknown;
    summary?: unknown;
    context?: { color?: unknown };
  };

  if (!isQuickFixId(candidate.id)) return null;

  const label = String(candidate.label ?? "").trim();
  const summary = String(candidate.summary ?? "").trim();
  if (!label || !summary) return null;

  const color = String(candidate.context?.color ?? "").trim();
  return {
    id: candidate.id,
    label,
    summary,
    ...(color ? { context: { color } } : {}),
  };
}

export function parseSubmittedVitrinaQuickFixes(
  rawFixes: string,
  rawFixIds: string
): VitrinaQuickFixOption[] {
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
    return submitted.slice(0, 4);
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
    .slice(0, 4);
}

export async function resolveVitrinaQuickFixes(
  productId: string,
  requestedFixes: VitrinaQuickFixOption[]
): Promise<{ fixes: VitrinaQuickFixOption[]; error?: string }> {
  if (requestedFixes.length === 0) {
    return { fixes: [], error: "No quick fixes selected." };
  }

  const recommendation = await getVitrinaProductMarketingRecommendationByProductId(productId);
  if (!recommendation) {
    return { fixes: [], error: "Product recommendation not found." };
  }

  const allowed = new Map((recommendation.quickFixes ?? []).map((fix) => [fix.id, fix]));
  const fixes = requestedFixes
    .map((requested) => {
      const allowedFix = allowed.get(requested.id);
      if (!allowedFix) return null;

      if (requested.id === "default_color") {
        const color = requested.context?.color?.trim() || allowedFix.context?.color?.trim();
        if (!color) return null;
        return {
          ...allowedFix,
          context: { color },
        };
      }

      return allowedFix;
    })
    .filter((fix): fix is VitrinaQuickFixOption => Boolean(fix))
    .slice(0, 4);

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
    .where(eq(productsTable.id, productId))
    .limit(1);

  if (!product) {
    return { applied: [], error: "Product not found." };
  }

  const content = parseProductContent(product.description);
  let nextPrice = product.price;
  let nextJomlaPrice = product.jomlaPrice;
  let nextColors = content.colors;
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

    if (fix.id === "promo_price" && nextJomlaPrice == null) {
      const vitrinaPrice = Math.max(1, Math.round(nextPrice / (1 + VITRINA_STANDARD_MARKUP)));
      nextJomlaPrice = vitrinaPrice;
      applied.push(fix.summary);
      continue;
    }

    if (fix.id === "availability_note" && product.instock > 0) {
      const availabilityValue = `In stock — ${product.instock} unit${product.instock === 1 ? "" : "s"} ready to ship.`;
      const existing = nextAdditionalInfo.find((entry) => entry.key === AVAILABILITY_KEY);
      if (existing?.value === availabilityValue) {
        applied.push(fix.summary);
        continue;
      }
      nextAdditionalInfo = upsertAdditionalInfo(nextAdditionalInfo, AVAILABILITY_KEY, availabilityValue);
      contentChanged = true;
      applied.push(fix.summary);
      continue;
    }

    if (fix.id === "quality_highlight") {
      const ratingLabel =
        product.rating > 0 ?
          `Customer rating ${product.rating.toFixed(1)}/5 — review quality before you buy.`
        : "Check customer reviews and product details before you buy.";
      const existing = nextAdditionalInfo.find((entry) => entry.key === QUALITY_KEY);
      if (existing?.value === ratingLabel) {
        applied.push(fix.summary);
        continue;
      }
      nextAdditionalInfo = upsertAdditionalInfo(nextAdditionalInfo, QUALITY_KEY, ratingLabel);
      contentChanged = true;
      applied.push(fix.summary);
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
      const snippet = buildDefaultHeroReviewSnippet(product.rating);
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
    nextDescription = serializeProductContent({
      ...content,
      colors: nextColors,
      additionalInfo: nextAdditionalInfo,
    });
  }

  if (contentChanged || priceChanged) {
    await db
      .update(productsTable)
      .set({
        ...(priceChanged ? { jomlaPrice: nextJomlaPrice } : {}),
        ...(contentChanged ? { description: nextDescription } : {}),
      })
      .where(eq(productsTable.id, productId));
  }

  const storefrontProductId = resolveStorefrontProductId(product.title, product.id);
  const appliedFixIds = fixes
    .map((fix) => fix.id)
    .filter((id, index, all) => all.indexOf(id) === index);
  const summaryLines = applied.slice(0, 4).join(" • ");
  await logAppliedAction({
    kind: "vitrina_quick_fix",
    title: `Vitrina quick fix · ${product.title}`,
    summary: summaryLines || `${applied.length} quick fix${applied.length === 1 ? "" : "es"} applied`,
    productLocalId: storefrontProductId > 0 ? storefrontProductId : null,
    productTitle: product.title,
    sourceRefId: productId,
    details: {
      productDbId: productId,
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

  return { applied };
}
