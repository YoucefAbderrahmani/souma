"use client";

import {
  flushProductAnalyticsNow,
  trackProductAnalytics,
} from "@/lib/product-analytics-client";

/** Funnel step: one count per Add to cart button press (not cart page visits or Buy now). */
export const FUNNEL_ADD_TO_CART_EVENT = "pa_funnel_add_to_cart" as const;

export function trackFunnelAddToCartClick(payload: Record<string, unknown>) {
  trackProductAnalytics(FUNNEL_ADD_TO_CART_EVENT, {
    ...payload,
    source: "add_to_cart_button",
  });
  trackProductAnalytics("pa_add_to_cart", payload);
  void flushProductAnalyticsNow();
}
