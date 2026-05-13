export type VitrinaMarketingPriority = "high" | "medium" | "low";

export type VitrinaQuickFixId =
  | "default_color"
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
