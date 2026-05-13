import type { ProductAdditionalInfo } from "@/lib/product-content";
import { parseProductContent } from "@/lib/product-content";

export const VITRINA_MERCH_KEYS = {
  trendingCountdown: "Merch: Trending countdown",
  heroReview: "Merch: Hero review",
} as const;

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
