import type { VitrinaProductMarketingRecommendation } from "@/types/vitrina-product-recommendations";

const STORAGE_KEY = "seller_helper_vitrina_recommendations";

type VitrinaRecommendationsCachePayload = {
  generatedAt: string;
  recommendations: VitrinaProductMarketingRecommendation[];
};

function isRecommendationArray(value: unknown): value is VitrinaProductMarketingRecommendation[] {
  return Array.isArray(value);
}

export function readCachedVitrinaRecommendations(): VitrinaProductMarketingRecommendation[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<VitrinaRecommendationsCachePayload>;
    return isRecommendationArray(parsed.recommendations) ? parsed.recommendations : [];
  } catch {
    return [];
  }
}

export function writeCachedVitrinaRecommendations(
  recommendations: VitrinaProductMarketingRecommendation[]
): void {
  if (typeof window === "undefined") return;

  const payload: VitrinaRecommendationsCachePayload = {
    generatedAt: new Date().toISOString(),
    recommendations,
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota or private-mode storage failures.
  }
}

/** Product IDs hidden from Seller Helper Vitrina list after quick fixes apply; cleared on next analysis. */
const QUICK_FIX_APPLIED_IDS_KEY = "seller_helper_vitrina_quick_fix_applied_ids";

function readQuickFixAppliedProductIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(QUICK_FIX_APPLIED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id) => String(id)));
  } catch {
    return new Set();
  }
}

export function addVitrinaQuickFixAppliedProductId(productId: string): void {
  if (typeof window === "undefined") return;
  const next = readQuickFixAppliedProductIds();
  next.add(String(productId));
  try {
    window.sessionStorage.setItem(QUICK_FIX_APPLIED_IDS_KEY, JSON.stringify(Array.from(next)));
  } catch {
    /* ignore */
  }
}

export function clearVitrinaQuickFixAppliedProductIds(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(QUICK_FIX_APPLIED_IDS_KEY);
  } catch {
    /* ignore */
  }
}

export function filterOutQuickFixAppliedRecommendations(
  items: VitrinaProductMarketingRecommendation[]
): VitrinaProductMarketingRecommendation[] {
  const hidden = readQuickFixAppliedProductIds();
  if (hidden.size === 0) return items;
  return items.filter((item) => !hidden.has(String(item.productId)));
}
