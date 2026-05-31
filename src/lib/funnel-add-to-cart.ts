"use client";

import {
  flushProductAnalyticsNow,
  trackProductAnalytics,
} from "@/lib/product-analytics-client";

/** Funnel step: add-to-cart intent (button or Purchase now — not cart page visits). */
export const FUNNEL_ADD_TO_CART_EVENT = "pa_funnel_add_to_cart" as const;

export type FunnelAddToCartIntent = "add_to_cart_button" | "purchase_now";

export function trackFunnelAddToCartClick(
  payload: Record<string, unknown>,
  options?: { intent?: FunnelAddToCartIntent }
) {
  const intent = options?.intent ?? "add_to_cart_button";
  trackProductAnalytics(FUNNEL_ADD_TO_CART_EVENT, {
    ...payload,
    source: intent,
    funnel_intent: intent,
  });
  trackProductAnalytics("pa_add_to_cart", {
    ...payload,
    from: typeof payload.from === "string" ? payload.from : intent,
  });
  if (intent === "purchase_now") {
    trackProductAnalytics("pa_buy_now", {
      product_id: payload.product_id,
      from: "product_page",
      quantity: payload.quantity,
      detail_price: payload.detail_price,
    });
  }
  void flushProductAnalyticsNow();
}
