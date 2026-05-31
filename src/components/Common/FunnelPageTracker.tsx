"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  flushProductAnalyticsNow,
  setProductAnalyticsPageContext,
  trackProductAnalytics,
} from "@/lib/product-analytics-client";

function resolveFunnelPageEvent(pathname: string): string | null {
  if (pathname.includes("shop-details")) return "pa_funnel_product_page";
  if (pathname.includes("checkout")) return "pa_funnel_checkout_page";
  return null;
}

/**
 * Records one funnel step per storefront page landing (every navigation, any entry path).
 */
export default function FunnelPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/seller-helper")) return;

    const eventName = resolveFunnelPageEvent(pathname);
    if (!eventName) return;

    setProductAnalyticsPageContext({ pagePath: pathname, product: null });
    trackProductAnalytics(eventName, {
      page_path: pathname,
      query: searchParams.toString() || undefined,
      product_id: searchParams.get("productId") ?? undefined,
      source: "funnel_page_visit",
    });
    void flushProductAnalyticsNow();
  }, [pathname, searchParams]);

  return null;
}
