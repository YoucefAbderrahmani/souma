import type { ProductAdditionalInfo } from "@/lib/product-content";
import { parseProductContent } from "@/lib/product-content";

/** `additionalInfo` keys written by Vitrina quick fixes (`apply-vitrina-quick-fixes`). */
export const VITRINA_QUICK_FIX_INFO_KEYS = {
  quality: "Quality",
  availability: "Availability",
} as const;

export const VITRINA_MERCH_KEYS = {
  trendingCountdown: "Merch: Trending countdown",
  heroReview: "Merch: Hero review",
} as const;

const STOREFRONT_STRIP_MAX = 132;

function truncateStorefrontStrip(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= STOREFRONT_STRIP_MAX) return t;
  return `${t.slice(0, STOREFRONT_STRIP_MAX - 1)}…`;
}

export function isVitrinaMerchandisingKey(key: string): boolean {
  return key === VITRINA_MERCH_KEYS.trendingCountdown || key === VITRINA_MERCH_KEYS.heroReview;
}

/** One-line hero strip from a real verified storefront review (no scripted marketing copy). */
export function buildHeroReviewSnippetFromVerifiedReview(review: { rating: number; comment: string }): string {
  const stars = Math.max(1, Math.min(5, Math.round(review.rating)));
  const oneLine = review.comment.replace(/\s+/g, " ").replace(/["”“]/g, "'").trim();
  const max = 96;
  const body = oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
  return `⭐ ${stars}/5 — “${body}”`;
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
 * Single strip for catalog / PDP hero overlay: verified-review line first, then Quality / Availability
 * lines from quick fixes (so cards show rating copy even when there is no written review yet).
 */
export function getStorefrontMerchHeroStripFromAdditionalInfo(
  additionalInfo: ProductAdditionalInfo[]
): string | null {
  const merch = getVitrinaMerchandisingFromAdditionalInfo(additionalInfo);
  if (merch.heroReviewSnippet?.trim()) return truncateStorefrontStrip(merch.heroReviewSnippet.trim());

  const quality = additionalInfo.find((row) => row.key === VITRINA_QUICK_FIX_INFO_KEYS.quality)?.value?.trim();
  if (quality) return truncateStorefrontStrip(quality);

  const availability = additionalInfo
    .find((row) => row.key === VITRINA_QUICK_FIX_INFO_KEYS.availability)
    ?.value?.trim();
  if (availability) return truncateStorefrontStrip(availability);

  return null;
}
