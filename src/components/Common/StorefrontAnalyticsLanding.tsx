"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  setProductAnalyticsPageContext,
  trackProductAnalytics,
} from "@/lib/product-analytics-client";
import { inferDeviceFromUserAgent, parseTrafficSource } from "@/lib/parse-traffic-source";

const LANDING_SENT_KEY = "pa_storefront_landing_sent";

/**
 * Records landing traffic on every storefront page (not only /shop-details).
 * Messenger / homepage visits otherwise send no pa_* events until the user clicks.
 */
export default function StorefrontAnalyticsLanding() {
  const pathname = usePathname();
  const sent = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/seller-helper")) return;
    if (pathname === "/shop-details") return;

    setProductAnalyticsPageContext({ pagePath: pathname, product: null });

    let alreadySent = sent.current;
    try {
      if (!alreadySent) alreadySent = sessionStorage.getItem(LANDING_SENT_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (alreadySent) return;

    sent.current = true;
    try {
      sessionStorage.setItem(LANDING_SENT_KEY, "1");
    } catch {
      /* ignore */
    }

    const ua = navigator.userAgent || "";
    const { source, utm, fbclid, igshid } = parseTrafficSource();
    trackProductAnalytics("pa_global_context", {
      device: inferDeviceFromUserAgent(ua),
      user_agent: ua.slice(0, 500),
      source,
      utm,
      fbclid,
      igshid,
      country: (navigator.language || "").slice(0, 32),
      page: pathname,
      page_path: pathname,
      page_type: pathname === "/" ? "home" : "storefront",
      locale: navigator.language || "",
      timezone_offset_min: new Date().getTimezoneOffset(),
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
    });
  }, [pathname]);

  return null;
}
