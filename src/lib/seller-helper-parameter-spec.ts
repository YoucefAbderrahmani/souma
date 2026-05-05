import type { PaEventName } from "@/lib/pa-whitelist";

export type SellerHelperParameterSpec = {
  event: PaEventName;
  legacyParameters: string[];
  newParameters: string[];
  usedByDashboard: string[];
};

/**
 * Seller Helper telemetry contract.
 * - `legacyParameters`: keys already tracked/used historically
 * - `newParameters`: keys added to improve diagnostics/attribution
 * - `usedByDashboard`: dashboard cards/graphs/indicators depending on this event
 */
export const SELLER_HELPER_PARAMETER_SPECS: SellerHelperParameterSpec[] = [
  {
    event: "pa_product_view",
    legacyParameters: ["product_id"],
    newParameters: ["page_path", "page_type"],
    usedByDashboard: ["Funnel: product view", "Top pages", "Traffic volume"],
  },
  {
    event: "pa_add_to_cart",
    legacyParameters: ["cart_line_items", "cart_total_dzd"],
    newParameters: ["items_qty_total", "currency", "page_path"],
    usedByDashboard: ["Funnel: add to cart", "Friction: product -> cart", "Top pages conversion"],
  },
  {
    event: "pa_begin_checkout",
    legacyParameters: ["cart_line_items", "cart_total_dzd"],
    newParameters: ["items_qty_total", "currency", "checkout_entry"],
    usedByDashboard: ["Funnel: checkout start", "Friction: cart -> checkout"],
  },
  {
    event: "pa_checkout_step",
    legacyParameters: ["step", "total_dzd", "cart_line_items"],
    newParameters: ["status", "provider", "payment_method", "failure_code", "failure_reason"],
    usedByDashboard: ["Checkout diagnostics", "Recommendations quality"],
  },
  {
    event: "pa_purchase",
    legacyParameters: ["total_dzd", "line_items"],
    newParameters: ["order_value", "currency", "items_qty_total", "provider", "status"],
    usedByDashboard: ["Funnel: purchase", "Conversion KPI", "Revenue-aware recommendations"],
  },
  {
    event: "pa_global_context",
    legacyParameters: ["device", "source", "country", "page", "utm"],
    newParameters: ["page_path", "page_type", "locale", "timezone_offset_min", "viewport_w", "viewport_h"],
    usedByDashboard: ["Device split", "Traffic attribution", "Audience context"],
  },
  {
    event: "pa_performance",
    legacyParameters: ["page_load_ms", "ttfb_ms", "lcp_ms", "checkout_api_ms", "chargily_checkout"],
    newParameters: ["page_path", "route_group"],
    usedByDashboard: ["Performance alerts", "Analyze signals"],
  },
  {
    event: "pa_js_error",
    legacyParameters: ["message", "filename", "lineno"],
    newParameters: ["page_path", "stack_head"],
    usedByDashboard: ["Security/quality signals", "Analyze signals"],
  },
];

