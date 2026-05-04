"use client";

import { useCallback, useEffect, useRef } from "react";
import { setProductAnalyticsProductContext, trackProductAnalytics } from "@/lib/product-analytics-client";

function inferDevice(ua: string): "mobile" | "tablet" | "desktop" {
  const l = ua.toLowerCase();
  if (l.includes("ipad") || (l.includes("android") && !l.includes("mobile"))) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

function parseTrafficSource(): { source: string; utm: Record<string, string> } {
  if (typeof window === "undefined") return { source: "direct", utm: {} };
  let source = "direct";
  try {
    const r = document.referrer;
    if (r) source = new URL(r).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  const utm: Record<string, string> = {};
  const sp = new URLSearchParams(window.location.search);
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const v = sp.get(k);
    if (v) utm[k.replace("utm_", "")] = v.slice(0, 120);
  }
  if (utm.source) source = `${source}|utm:${utm.source}`;
  return { source, utm };
}

type Args = {
  productId: number;
  productTitle: string;
  category: string;
  jomlaPrice?: number | null;
  previewImg: number;
  activeTab: string;
  activeColor: string;
  selectedSpecs: Record<string, string>;
  detailPrice: number;
};

export function useProductAnalyticsTracking({
  productId,
  productTitle,
  category,
  jomlaPrice,
  previewImg,
  activeTab,
  activeColor,
  selectedSpecs,
  detailPrice,
}: Args) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const priceRef = useRef<HTMLHeadingElement | null>(null);
  const globalSent = useRef(false);
  const scrollBands = useRef(new Set<number>());
  const imgSince = useRef<number>(Date.now());
  const prevImg = useRef(previewImg);
  const lastSpecsJson = useRef<string>("");
  const lastColor = useRef(activeColor);
  const lastTab = useRef<string | null>(null);
  const pageEnter = useRef<number>(Date.now());
  const specsVisibleSince = useRef<number | null>(null);
  const specsDwellProductId = useRef<number | null>(null);

  const flushSpecsViewTime = useCallback((reason: "tab_change" | "unmount") => {
    const t = specsVisibleSince.current;
    const pid = specsDwellProductId.current;
    specsVisibleSince.current = null;
    specsDwellProductId.current = null;
    if (t === null || pid === null) return;
    const ms = Date.now() - t;
    if (ms < 400) return;
    trackProductAnalytics("pa_specs_view_time", {
      product_id: pid,
      visible_ms: ms,
      reason,
    });
  }, []);

  useEffect(() => {
    globalSent.current = false;
    scrollBands.current = new Set();
    pageEnter.current = Date.now();
    imgSince.current = Date.now();
    prevImg.current = 0;
    flushSpecsViewTime("unmount");
  }, [productId, flushSpecsViewTime]);

  useEffect(() => {
    return () => {
      flushSpecsViewTime("unmount");
    };
  }, [flushSpecsViewTime]);

  useEffect(() => {
    setProductAnalyticsProductContext({
      productId,
      productTitle,
      pagePath: typeof window !== "undefined" ? window.location.pathname : "/shop-details",
    });
  }, [productId, productTitle]);

  useEffect(() => {
    if (typeof window === "undefined" || globalSent.current) return;
    globalSent.current = true;
    const ua = navigator.userAgent || "";
    const { source, utm } = parseTrafficSource();
    trackProductAnalytics("pa_global_context", {
      device: inferDevice(ua),
      user_agent: ua.slice(0, 500),
      source,
      utm,
      country: (navigator.language || "").slice(0, 32),
      page: window.location.pathname,
    });
    trackProductAnalytics("pa_product_ident", {
      product_id: productId,
      price: detailPrice,
      promo_price: jomlaPrice ?? null,
      category,
    });
    trackProductAnalytics("pa_product_view", {
      product_id: productId,
    });
  }, [productId, detailPrice, jomlaPrice, category]);

  useEffect(() => {
    const t = window.setInterval(() => {
      trackProductAnalytics("pa_product_view_time", {
        product_id: productId,
        visible_ms: 25_000,
      });
    }, 25_000);
    return () => {
      window.clearInterval(t);
      const dwell = Date.now() - pageEnter.current;
      if (dwell > 800) {
        trackProductAnalytics("pa_product_view_time", {
          product_id: productId,
          visible_ms: dwell,
          session_total: true,
        });
      }
    };
  }, [productId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      const el = document.documentElement;
      const h = el.scrollHeight - el.clientHeight;
      if (h <= 0) return;
      const p = (el.scrollTop / h) * 100;
      for (const band of [25, 50, 75, 100] as const) {
        if (p >= band - 2 && !scrollBands.current.has(band)) {
          scrollBands.current.add(band);
          trackProductAnalytics("pa_scroll", { depth_pct: band, page: window.location.pathname });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (prevImg.current === previewImg) return;
    const dwell = Date.now() - imgSince.current;
    if (dwell > 200) {
      trackProductAnalytics("pa_image_view_time", {
        image_index: prevImg.current,
        ms: dwell,
      });
    }
    prevImg.current = previewImg;
    imgSince.current = Date.now();
  }, [previewImg]);

  useEffect(() => {
    const j = JSON.stringify(selectedSpecs);
    if (lastSpecsJson.current === j && lastColor.current === activeColor) return;
    lastSpecsJson.current = j;
    lastColor.current = activeColor;
    trackProductAnalytics("pa_select_option", {
      color: activeColor,
      specs: selectedSpecs,
    });
  }, [activeColor, selectedSpecs]);

  useEffect(() => {
    if (activeTab === "tabTwo") {
      if (specsVisibleSince.current === null) {
        specsVisibleSince.current = Date.now();
        specsDwellProductId.current = productId;
      }
    } else {
      flushSpecsViewTime("tab_change");
    }
  }, [activeTab, productId, flushSpecsViewTime]);

  useEffect(() => {
    if (lastTab.current === null) {
      lastTab.current = activeTab;
      return;
    }
    if (lastTab.current === activeTab) return;
    trackProductAnalytics("pa_specs_interaction", {
      from_tab: lastTab.current,
      to_tab: activeTab,
    });
    lastTab.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    try {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav?.entryType === "navigation") {
        const page_load_ms = Math.round(Math.max(0, nav.loadEventEnd - nav.fetchStart));
        trackProductAnalytics("pa_performance", {
          page_load_ms,
          ttfb_ms: Math.round(Math.max(0, nav.responseStart - nav.requestStart)),
        });
      }
    } catch {
      trackProductAnalytics("pa_performance", { page_load_ms: null, unsupported: true });
    }

    let po: PerformanceObserver | null = null;
    try {
      po = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number };
        const start = (last as { startTime?: number }).startTime ?? 0;
        if (start > 0) {
          trackProductAnalytics("pa_performance", { lcp_ms: Math.round(start) });
          po?.disconnect();
        }
      });
      po.observe({ type: "largest-contentful-paint", buffered: true } as PerformanceObserverInit);
    } catch {
      /* LCP unsupported */
    }

    const onErr = (ev: ErrorEvent) => {
      trackProductAnalytics("pa_js_error", {
        message: String(ev.message || "error").slice(0, 500),
        filename: ev.filename,
        lineno: ev.lineno,
      });
    };
    window.addEventListener("error", onErr);
    return () => {
      window.removeEventListener("error", onErr);
      try {
        po?.disconnect();
      } catch {
        /* noop */
      }
    };
  }, []);

  const onGalleryZoom = useCallback(() => {
    trackProductAnalytics("pa_image_interaction", {
      kind: "zoom",
      image_index: previewImg,
    });
  }, [previewImg]);

  const onThumbnailSelect = useCallback(
    (index: number) => {
      trackProductAnalytics("pa_image_interaction", {
        kind: "click",
        image_index: index,
      });
    },
    []
  );

  return {
    titleRef,
    priceRef,
    onGalleryZoom,
    onThumbnailSelect,
  };
}
