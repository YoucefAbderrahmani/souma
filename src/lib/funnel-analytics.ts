import { PA_FUNNEL } from "@/lib/pa-whitelist";

/** Events that update the Seller Helper conversion funnel — flushed immediately after enqueue. */
export const FUNNEL_ANALYTICS_EVENTS = new Set<string>([
  PA_FUNNEL.productView,
  "pa_product_ident",
  PA_FUNNEL.addToCart,
  "pa_buy_now",
  PA_FUNNEL.beginCheckout,
  PA_FUNNEL.checkoutStep,
  PA_FUNNEL.paymentFailed,
  "pa_abandon_checkout",
  PA_FUNNEL.purchase,
]);

export function isFunnelAnalyticsEvent(name: string): boolean {
  return FUNNEL_ANALYTICS_EVENTS.has(name);
}
