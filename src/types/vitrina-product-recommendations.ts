import { clampVitrinaFixesPerItem } from "@/lib/vitrina-fixes-per-item";

export function capVitrinaRecommendationFixes(
  item: VitrinaProductMarketingRecommendation,
  fixesPerItem: number
): VitrinaProductMarketingRecommendation {
  const max = clampVitrinaFixesPerItem(fixesPerItem);
  const tips = item.tips.slice(0, max);
  const quickFixes = item.quickFixes?.slice(0, max);
  return {
    ...item,
    tips,
    quickFixes: quickFixes && quickFixes.length > 0 ? quickFixes : undefined,
    primaryRecommendation: tips[0]?.action ?? item.primaryRecommendation,
  };
}

export function capVitrinaRecommendationsList(
  items: VitrinaProductMarketingRecommendation[],
  fixesPerItem: number
): VitrinaProductMarketingRecommendation[] {
  return items.map((item) => capVitrinaRecommendationFixes(item, fixesPerItem));
}

export type VitrinaMarketingPriority = "critical" | "high" | "medium" | "low";

export type VitrinaQuickFixId =
  | "default_color"
  | "default_size"
  | "promo_price"
  | "availability_note"
  | "quality_highlight"
  | "trending_countdown"
  | "hero_review_snippet";

export type VitrinaQuickFixOption = {
  id: VitrinaQuickFixId;
  label: string;
  summary: string;
  context?: {
    color?: string;
    size?: string;
  };
};

export type VitrinaProductMarketingTip = {
  label: string;
  action: string;
  priority: VitrinaMarketingPriority;
  quickFixId?: VitrinaQuickFixId;
};

export type VitrinaProductInteractionSummary = {
  views: number;
  hovers: number;
  clicks: number;
  addToCarts: number;
  viewToCartRate: number | null;
  interactionScore: number;
};

export type VitrinaProductMarketingRecommendation = {
  productId: string;
  slug: string;
  title: string;
  mainimage: string;
  categoryName: string;
  price: number;
  jomlaPrice: number | null;
  instock: number;
  manufacturer: string;
  rating: number;
  description: string;
  primaryRecommendation: string;
  tips: VitrinaProductMarketingTip[];
  quickFixes?: VitrinaQuickFixOption[];
  isTopRecommendation?: boolean;
  opportunityScore?: number;
  signals?: VitrinaProductInteractionSummary;
};
