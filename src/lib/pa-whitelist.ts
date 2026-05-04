/**
 * Product analytics event names (stored in `sales_micro_event.event_name`).
 * All names use prefix `pa_` (max length 80). Payloads are JSON objects.
 */
export const PA_EVENT_NAMES = [
  "pa_global_context",
  "pa_product_ident",
  "pa_product_view",
  "pa_product_view_time",
  "pa_select_option",
  "pa_image_interaction",
  "pa_image_view_time",
  "pa_review_interaction",
  "pa_review_scroll",
  "pa_review_view_time",
  "pa_specs_interaction",
  "pa_specs_view_time",
  "pa_scroll",
  "pa_add_to_cart",
  "pa_remove_from_cart",
  "pa_begin_checkout",
  "pa_checkout_step",
  "pa_purchase",
  "pa_abandon_checkout",
  "pa_search",
  "pa_add_to_wishlist",
  "pa_performance",
  "pa_navigation",
  "pa_js_error",
] as const;

export type PaEventName = (typeof PA_EVENT_NAMES)[number];

const PA_SET = new Set<string>(PA_EVENT_NAMES);

export function isPaEventName(name: string): name is PaEventName {
  return PA_SET.has(name);
}

/** Funnel / KPI keys used by Conception metrics (subset of PA_EVENT_NAMES). */
export const PA_FUNNEL = {
  productView: "pa_product_view",
  addToCart: "pa_add_to_cart",
  beginCheckout: "pa_begin_checkout",
  purchase: "pa_purchase",
} as const;
