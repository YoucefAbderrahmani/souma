"use client";

import {
  hasFunnelChargilyCheckoutBeenSent,
  markFunnelChargilyCheckoutSent,
} from "@/lib/funnel-checkout-session";
import {
  flushProductAnalyticsNow,
  trackProductAnalytics,
} from "@/lib/product-analytics-client";

/** Funnel step: checkout started — when the Chargily payment page is opened (not /checkout visit). */
export const FUNNEL_CHECKOUT_STARTED_EVENT = "pa_funnel_checkout_page" as const;

export function trackFunnelChargilyCheckoutOpened(payload?: Record<string, unknown>): void {
  if (hasFunnelChargilyCheckoutBeenSent()) return;
  markFunnelChargilyCheckoutSent();
  trackProductAnalytics(FUNNEL_CHECKOUT_STARTED_EVENT, {
    ...payload,
    source: "chargily_checkout_opened",
  });
  void flushProductAnalyticsNow();
}
