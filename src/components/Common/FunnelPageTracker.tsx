"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  flushProductAnalyticsNow,
  setProductAnalyticsPageContext,
  trackProductAnalytics,
} from "@/lib/product-analytics-client";

/**
 * Records funnel product page visits only.
 * Checkout started = Chargily opened; order completed = Go back to store click (see Checkout).
 */
export default function FunnelPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/seller-helper")) return;
    if (!pathname.includes("shop-details")) return;

    setProductAnalyticsPageContext({ pagePath: pathname, product: null });
    trackProductAnalytics("pa_funnel_product_page", {
      page_path: pathname,
      query: searchParams.toString() || undefined,
      product_id: searchParams.get("productId") ?? undefined,
      source: "funnel_page_visit",
    });
    void flushProductAnalyticsNow();
  }, [pathname, searchParams]);

  return null;
}
