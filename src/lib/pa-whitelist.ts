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
  "pa_pointer_hover",
  "pa_pointer_click",
  "pa_add_to_cart",
  "pa_buy_now",
  "pa_remove_from_cart",
  "pa_begin_checkout",
  "pa_checkout_step",
  "pa_payment_failed",
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
  buyNow: "pa_buy_now",
  beginCheckout: "pa_begin_checkout",
  checkoutStep: "pa_checkout_step",
  paymentFailed: "pa_payment_failed",
  purchase: "pa_purchase",
} as const;

/** Events that count as “checkout started” in the conversion funnel. */
export const PA_FUNNEL_CHECKOUT_SIGNALS = [
  PA_FUNNEL.beginCheckout,
  PA_FUNNEL.checkoutStep,
  "pa_abandon_checkout",
  PA_FUNNEL.paymentFailed,
] as const;
