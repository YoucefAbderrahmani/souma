import type { ProductAdditionalInfo } from "@/lib/product-content";
import { parseProductContent } from "@/lib/product-content";

/** Catalogue titles with no Vitrina/demo promo overlays or live review hero strip on images. */
export const VITRINA_STOREFRONT_MERCH_EXCLUDED_TITLES = [
  "Logitech MX Master 3 Mouse",
  "Apple iMac M1 24-inch 2021",
  "Pants",
] as const;

const MERCH_EXCLUDED_TITLE_KEYS = new Set(
  VITRINA_STOREFRONT_MERCH_EXCLUDED_TITLES.map((title) => title.trim().toLowerCase())
);

export function isVitrinaStorefrontMerchExcluded(product: { title: string }): boolean {
  return MERCH_EXCLUDED_TITLE_KEYS.has(product.title.trim().toLowerCase());
}

/** `additionalInfo` keys written by Vitrina quick fixes (`apply-vitrina-quick-fixes`). */
export const VITRINA_QUICK_FIX_INFO_KEYS = {
  quality: "Quality",
  availability: "Availability",
} as const;

export const VITRINA_MERCH_KEYS = {
  trendingCountdown: "Merch: Trending countdown",
  heroReview: "Merch: Hero review",
  catalogBoost: "Merch: Catalog boost",
  promoStartedAt: "Merch: Promo started",
} as const;

const STOREFRONT_STRIP_MAX = 132;

function truncateStorefrontStrip(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= STOREFRONT_STRIP_MAX) return t;
  return `${t.slice(0, STOREFRONT_STRIP_MAX - 1)}…`;
}

export function isVitrinaMerchandisingKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return (
    normalized === VITRINA_MERCH_KEYS.trendingCountdown.toLowerCase() ||
    normalized === VITRINA_MERCH_KEYS.heroReview.toLowerCase() ||
    normalized.startsWith("merch:")
  );
}

/** True when this additionalInfo row was written by Vitrina quick fixes (or equivalent merch copy). */
export function isVitrinaQuickFixAdditionalInfoEntry(entry: ProductAdditionalInfo): boolean {
  const key = entry.key.trim();
  const keyLower = key.toLowerCase();
  const value = entry.value.trim();

  if (isVitrinaMerchandisingKey(key)) return true;
  if (keyLower === VITRINA_QUICK_FIX_INFO_KEYS.quality.toLowerCase()) return true;
  if (keyLower === VITRINA_QUICK_FIX_INFO_KEYS.availability.toLowerCase()) return true;

  if (readTrendingCountdownEnd(value)) return true;
  if (/^⭐\s*\d\s*\/\s*5/i.test(value)) return true;
  if (/^in stock\s*—/i.test(value)) return true;
  if (/customer rating\s+\d/i.test(value) || /check customer reviews/i.test(value)) return true;

  return false;
}

export function additionalInfoHasVitrinaHeroOrStripContent(
  additionalInfo: ProductAdditionalInfo[]
): boolean {
  return additionalInfo.some((entry) => {
    if (!isVitrinaQuickFixAdditionalInfoEntry(entry)) return false;
    const keyLower = entry.key.trim().toLowerCase();
    if (keyLower === VITRINA_MERCH_KEYS.heroReview.toLowerCase()) return true;
    if (keyLower === VITRINA_QUICK_FIX_INFO_KEYS.quality.toLowerCase()) return true;
    if (keyLower === VITRINA_QUICK_FIX_INFO_KEYS.availability.toLowerCase()) return true;
    if (/^⭐\s*\d\s*\/\s*5/i.test(entry.value.trim())) return true;
    return false;
  });
}

/** One-line hero strip from a real verified storefront review (no scripted marketing copy). */
export function buildHeroReviewSnippetFromVerifiedReview(review: { rating: number; comment: string }): string {
  const stars = Math.max(1, Math.min(5, Math.round(review.rating)));
  const oneLine = review.comment.replace(/\s+/g, " ").replace(/["”“]/g, "'").trim();
  const max = 96;
  const body = oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
  return `⭐ ${stars}/5 — “${body}”`;
}

export function readMerchTimestampMs(value?: string | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readCatalogBoostAt(additionalInfo: ProductAdditionalInfo[]): number | null {
  const value = additionalInfo.find((row) => row.key === VITRINA_MERCH_KEYS.catalogBoost)?.value;
  return readMerchTimestampMs(value);
}

export function readPromoStartedAt(additionalInfo: ProductAdditionalInfo[]): number | null {
  const value = additionalInfo.find((row) => row.key === VITRINA_MERCH_KEYS.promoStartedAt)?.value;
  return readMerchTimestampMs(value);
}

export function readTrendingCountdownEnd(value?: string | null): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

export function buildTrendingCountdownEnd(hours = 24): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function getVitrinaMerchandisingFromAdditionalInfo(additionalInfo: ProductAdditionalInfo[]) {
  const countdownValue = additionalInfo.find((row) => row.key === VITRINA_MERCH_KEYS.trendingCountdown)?.value;
  const heroReviewValue = additionalInfo.find((row) => row.key === VITRINA_MERCH_KEYS.heroReview)?.value?.trim();

  return {
    trendingCountdownEndsAt: readTrendingCountdownEnd(countdownValue),
    heroReviewSnippet: heroReviewValue || null,
  };
}

export function readHeroReviewSnippetFromDescription(description?: string | null): string | null {
  if (!description?.trim()) return null;
  return getVitrinaMerchandisingFromAdditionalInfo(parseProductContent(description).additionalInfo)
    .heroReviewSnippet;
}

/**
 * Hero image banner copy: persisted `Merch: Hero review` only (verified quote or ⭐ rating line).
 * Quality / Availability quick-fix lines stay in the Additional Information tab, not on the photo.
 */
export function getStorefrontMerchHeroStripFromAdditionalInfo(
  additionalInfo: ProductAdditionalInfo[]
): string | null {
  const merch = getVitrinaMerchandisingFromAdditionalInfo(additionalInfo);
  if (merch.heroReviewSnippet?.trim()) return truncateStorefrontStrip(merch.heroReviewSnippet.trim());
  return null;
}

/** Hero review strip for catalog cards and PDP (server field, description, live catalog). */
export function resolveStorefrontHeroReviewSnippet(product: {
  title: string;
  description?: string | null;
  heroReviewSnippet?: string | null;
}): string | null {
  if (isVitrinaStorefrontMerchExcluded(product)) return null;

  const parsed = parseProductContent(product.description ?? "");
  if (parsed.suppressLiveHeroReviewOverlay) return null;

  const fromCatalog = product.heroReviewSnippet?.trim();
  if (fromCatalog) return fromCatalog;

  return getStorefrontMerchHeroStripFromAdditionalInfo(parsed.additionalInfo);
}
