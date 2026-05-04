/**
 * Product analytics events (`pa_*`) are the canonical storefront telemetry.
 * Ingestion: POST /api/sales-analyst/events (whitelist in `pa-whitelist.ts`).
 */
export const PA_JS_ERROR = "pa_js_error" as const;

/** Funnel steps for Conception metrics (aligned with `PA_FUNNEL` server-side). */
export const STORE_EVENT = {
  productView: "pa_product_view",
  addToCart: "pa_add_to_cart",
  beginCheckout: "pa_begin_checkout",
  purchase: "pa_purchase",
  globalContext: "pa_global_context",
  pagePerformance: "pa_performance",
} as const;
