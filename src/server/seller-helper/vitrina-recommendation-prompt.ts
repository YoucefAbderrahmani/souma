import type { VitrinaMarketingPriority } from "@/types/vitrina-product-recommendations";

export type VitrinaDisplaySnapshot = {
  title: string;
  categoryName: string;
  manufacturer: string;
  price: number;
  jomlaPrice: number | null;
  instock: number;
  rating: number;
  descriptionLength: number;
  titleHasColorHint: boolean;
  titleHasPriceHint: boolean;
  titleHasBrandHint: boolean;
};

export type VitrinaInteractionSnapshot = {
  windowDays: number;
  views: number;
  viewDwellMs: number;
  hovers: number;
  clicks: number;
  addToCarts: number;
  optionSelects: number;
  imageViews: number;
  specsInteractions: number;
  specsDwellMs: number;
  scrollDepth75Plus: number;
  avgClickYpct: number | null;
  avgHoverYpct: number | null;
  topSelectedColors: string[];
  viewToCartRate: number | null;
  clickToCartRate: number | null;
};

export type VitrinaRecommendationPromptProduct = {
  productId: string;
  storefrontProductId: number;
  display: VitrinaDisplaySnapshot;
  interaction: VitrinaInteractionSnapshot;
  opportunityScore: number;
};

export type VitrinaRecommendationPromptPayload = {
  computedAt: string;
  maxRecommendations: number;
  parameterGuide: {
    displayFields: string[];
    interactionEvents: string[];
  };
  products: VitrinaRecommendationPromptProduct[];
};

export function buildVitrinaRecommendationSystemPrompt() {
  return `You are a merchandising analyst for Vitrina Store.
Use only the JSON payload provided by the user.
Return one JSON object with exactly one key: recommendations.
recommendations must be an array with at most the maxRecommendations value from the payload.
Each recommendation must include:
- productId (string, must match an input productId)
- primaryRecommendation (one concise merchandising action in French)
- tips (array of 1 to 3 objects with label, action, priority)
- isTopRecommendation (boolean; exactly one item in the array must be true)
priority must be exactly one of: high, medium, low.
Ground every recommendation in the supplied display and interaction fields.
Prioritize changes to title, main image, price visibility, default color, promo price, and catalog thumbnail messaging.
If interaction data is sparse, lower confidence and avoid inventing metrics.
Write primaryRecommendation, label, and action in French.`;
}

export function buildVitrinaRecommendationUserPrompt(payload: VitrinaRecommendationPromptPayload) {
  return `Generate storefront merchandising recommendations from this Seller Helper snapshot.
Select only products that need a visible merchandising change.
Return JSON only.

${JSON.stringify(payload)}`;
}

export function buildVitrinaRecommendationPromptPayload(
  products: VitrinaRecommendationPromptProduct[],
  options?: { maxRecommendations?: number }
): VitrinaRecommendationPromptPayload {
  const maxRecommendations = Math.min(3, Math.max(1, options?.maxRecommendations ?? 3));
  return {
    computedAt: new Date().toISOString(),
    maxRecommendations,
    parameterGuide: {
      displayFields: [
        "title",
        "categoryName",
        "manufacturer",
        "price",
        "jomlaPrice",
        "instock",
        "rating",
        "descriptionLength",
        "titleHasColorHint",
        "titleHasPriceHint",
        "titleHasBrandHint",
      ],
      interactionEvents: [
        "pa_product_view",
        "pa_product_view_time",
        "pa_pointer_hover",
        "pa_pointer_click",
        "pa_select_option",
        "pa_image_view_time",
        "pa_specs_interaction",
        "pa_specs_view_time",
        "pa_scroll",
        "pa_add_to_cart",
      ],
    },
    products: products.slice(0, maxRecommendations),
  };
}

export function isActionableVitrinaPriority(priority: VitrinaMarketingPriority) {
  return priority === "high" || priority === "medium";
}
