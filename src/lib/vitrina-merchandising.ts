import type { ProductAdditionalInfo } from "@/lib/product-content";
import { parseProductContent } from "@/lib/product-content";

export const VITRINA_MERCH_KEYS = {
  trendingCountdown: "Merch: Trending countdown",
  heroReview: "Merch: Hero review",
} as const;

const HERO_REVIEW_QUOTES = [
  "Even better than expected",
  "Customer favorite",
  "Worth it — would buy again",
] as const;

export function isVitrinaMerchandisingKey(key: string): boolean {
  return key === VITRINA_MERCH_KEYS.trendingCountdown || key === VITRINA_MERCH_KEYS.heroReview;
}

export function buildDefaultHeroReviewSnippet(rating: number): string {
  const score = rating > 0 ? rating.toFixed(1) : "4.9";
  const quote = HERO_REVIEW_QUOTES[Math.abs(Math.round(rating * 10)) % HERO_REVIEW_QUOTES.length];
  return `⭐ ${score} — "${quote}"`;
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
