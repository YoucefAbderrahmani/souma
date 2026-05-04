import type { PaEventName } from "@/lib/pa-whitelist";

export type PaParameterGroup = {
  id: string;
  title: string;
  description?: string;
  items: { event: PaEventName; label: string; hint?: string }[];
};

/** Admin UI: one row per `pa_*` event (what we can actually enable/disable in code + ingest). */
export const PA_TRACKING_PARAMETER_GROUPS: PaParameterGroup[] = [
  {
    id: "global",
    title: "Global context",
    description: "Device, traffic source, locale, and current page path.",
    items: [{ event: "pa_global_context", label: "Global context", hint: "device, source, country, page" }],
  },
  {
    id: "product",
    title: "Product identification & view",
    items: [
      { event: "pa_product_ident", label: "Product ID, price, category", hint: "price, category" },
      { event: "pa_product_view", label: "Product view (count signal)", hint: "view_count" },
      { event: "pa_product_view_time", label: "Product view time / dwell", hint: "view_time" },
    ],
  },
  {
    id: "options",
    title: "Options & variants",
    items: [{ event: "pa_select_option", label: "Option selection", hint: "color, size, specs" }],
  },
  {
    id: "images",
    title: "Images",
    items: [
      { event: "pa_image_interaction", label: "Image interaction", hint: "click / zoom" },
      { event: "pa_image_view_time", label: "Image view time", hint: "visual dwell" },
    ],
  },
  {
    id: "reviews",
    title: "Reviews",
    items: [
      { event: "pa_review_interaction", label: "Review interaction", hint: "filters, taps" },
      { event: "pa_review_scroll", label: "Review scroll depth", hint: "scroll" },
      { event: "pa_review_view_time", label: "Review view time", hint: "if emitted" },
    ],
  },
  {
    id: "specs",
    title: "Specifications",
    items: [
      { event: "pa_specs_interaction", label: "Specs interaction" },
      { event: "pa_specs_view_time", label: "Specs view time", hint: "if emitted" },
    ],
  },
  {
    id: "engagement",
    title: "Page engagement",
    items: [
      { event: "pa_scroll", label: "Scroll depth bands", hint: "scroll" },
      { event: "pa_navigation", label: "Navigation / route changes", hint: "breadcrumbs, exits" },
    ],
  },
  {
    id: "cart",
    title: "Cart & wishlist",
    items: [
      { event: "pa_add_to_cart", label: "Add to cart" },
      { event: "pa_remove_from_cart", label: "Remove from cart" },
      { event: "pa_add_to_wishlist", label: "Add to wishlist" },
    ],
  },
  {
    id: "checkout",
    title: "Checkout & purchase",
    items: [
      { event: "pa_begin_checkout", label: "Begin checkout" },
      { event: "pa_checkout_step", label: "Checkout step", hint: "payment redirect, etc." },
      { event: "pa_purchase", label: "Purchase", hint: "total in payload" },
      { event: "pa_abandon_checkout", label: "Abandon checkout", hint: "if emitted" },
    ],
  },
  {
    id: "search",
    title: "Search",
    items: [{ event: "pa_search", label: "Site search", hint: "query, matched_product_id, results_count" }],
  },
  {
    id: "technical",
    title: "Performance & errors",
    items: [
      { event: "pa_performance", label: "Performance", hint: "LCP, load, API timings" },
      { event: "pa_js_error", label: "JavaScript errors", hint: "client errors" },
    ],
  },
];

export const PA_CALCULATED_INSIGHTS_NOTE = [
  "conversion_rate",
  "add_to_cart_rate",
  "abandonment_rate",
  "avg_view_time",
  "top_products",
  "top_options",
  "search_frequency",
  "interest_score",
  "funnel_stage",
  "session_duration",
  "pages_viewed",
] as const;
