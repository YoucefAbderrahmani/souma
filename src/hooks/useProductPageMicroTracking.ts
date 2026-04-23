"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  setSalesMicroProductContext,
  trackSalesMicroEvent,
} from "@/lib/sales-analyst-client";

const TAB_META: Record<string, string> = {
  tabOne: "description",
  tabTwo: "additional_information",
  tabThree: "reviews",
};

type Args = {
  productId: number;
  productTitle: string;
  previewImg: number;
  activeTab: string;
  activeColor: string;
  selectedSpecs: Record<string, string>;
  detailPrice: number;
};

export function useProductPageMicroTracking({
  productId,
  productTitle,
  previewImg,
  activeTab,
  activeColor,
  selectedSpecs,
  detailPrice,
}: Args) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const priceRef = useRef<HTMLHeadingElement | null>(null);
  const imageDwellRef = useRef<{ index: number; since: number } | null>(null);
  const prevTab = useRef<string | null>(null);
  const prevColor = useRef<string | null>(null);
  const prevSpecsJson = useRef<string | null>(null);
  const colorSwitchTimestamps = useRef<number[]>([]);
  const priceHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceHoverFired = useRef(false);
  const rageClicks = useRef<{ target: string; times: number[] }>({ target: "", times: [] });

  useEffect(() => {
    if (!productTitle) return;
    setSalesMicroProductContext({
      productId,
      productTitle,
      pagePath: typeof window !== "undefined" ? window.location.pathname : "/shop-details",
    });
    trackSalesMicroEvent("product_page_enter", { product_id: productId });
  }, [productId, productTitle]);

  useEffect(() => {
    trackSalesMicroEvent("device_browser_context", {
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      language: typeof navigator !== "undefined" ? navigator.language : "",
    });

    try {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav?.entryType === "navigation") {
        trackSalesMicroEvent("page_navigation_timing", {
          ttfb_ms: Math.round(Math.max(0, nav.responseStart - nav.requestStart)),
          dom_content_loaded_ms: Math.round(Math.max(0, nav.domContentLoadedEventEnd - nav.fetchStart)),
          load_event_end_ms: Math.round(Math.max(0, nav.loadEventEnd - nav.fetchStart)),
        });
      }
    } catch {
      trackSalesMicroEvent("page_navigation_timing", { unsupported: true });
    }

    try {
      const po = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & {
          renderTime?: number;
          loadTime?: number;
        };
        if (last?.entryType === "largest-contentful-paint") {
          const start = last.renderTime || last.loadTime || last.startTime;
          trackSalesMicroEvent("web_vitals_lcp_ms", { value_ms: Math.round(start) });
          try {
            po.disconnect();
          } catch {
            /* ignore */
          }
        }
      });
      po.observe({ type: "largest-contentful-paint", buffered: true } as PerformanceObserverInit);
      return () => {
        try {
          po.disconnect();
        } catch {
          /* ignore */
        }
      };
    } catch {
      trackSalesMicroEvent("web_vitals_lcp_ms", { unsupported: true });
    }
    return undefined;
  }, []);

  useEffect(() => {
    const now = Date.now();
    const prev = imageDwellRef.current;
    if (prev) {
      const dwell = now - prev.since;
      if (prev.index !== previewImg && dwell > 300) {
        trackSalesMicroEvent("time_on_image", { image_index: prev.index, ms: dwell });
      }
      if (prev.index !== previewImg) {
        trackSalesMicroEvent("image_index_viewed", { image_index: previewImg });
      }
    } else {
      trackSalesMicroEvent("image_index_viewed", { image_index: previewImg });
    }
    imageDwellRef.current = { index: previewImg, since: now };
  }, [previewImg]);

  useEffect(() => {
    if (prevTab.current === null) {
      prevTab.current = activeTab;
      return;
    }
    if (prevTab.current === activeTab) return;
    const from = TAB_META[prevTab.current] ?? prevTab.current;
    const to = TAB_META[activeTab] ?? activeTab;
    trackSalesMicroEvent("accordion_expand_event", {
      tab_id: activeTab,
      tab_key: to,
      previous_tab_key: from,
    });
    prevTab.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (prevColor.current === null) {
      prevColor.current = activeColor;
      return;
    }
    if (prevColor.current === activeColor) return;
    trackSalesMicroEvent("variant_change", {
      axis: "color",
      from: prevColor.current,
      to: activeColor,
    });
    const t = Date.now();
    colorSwitchTimestamps.current.push(t);
    colorSwitchTimestamps.current = colorSwitchTimestamps.current.filter((x) => t - x < 8000);
    if (colorSwitchTimestamps.current.length >= 4) {
      trackSalesMicroEvent("variant_switch_frequency", {
        axis: "color",
        rapid_changes_in_window: colorSwitchTimestamps.current.length,
        window_ms: 8000,
      });
      colorSwitchTimestamps.current = [];
    }
    prevColor.current = activeColor;
  }, [activeColor]);

  useEffect(() => {
    const next = JSON.stringify(selectedSpecs);
    if (prevSpecsJson.current === null) {
      prevSpecsJson.current = next;
      return;
    }
    if (prevSpecsJson.current === next) return;
    trackSalesMicroEvent("variant_change", {
      axis: "spec",
      specs_after: selectedSpecs,
    });
    prevSpecsJson.current = next;
  }, [selectedSpecs]);

  useEffect(() => {
    const onCopy = () => {
      const sel = window.getSelection()?.toString()?.trim() ?? "";
      if (sel.length < 2) return;
      const el = titleRef.current;
      if (!el) return;
      const titleText = el.textContent?.trim() ?? "";
      if (!titleText) return;
      const probe = sel.slice(0, Math.min(24, sel.length));
      if (titleText.includes(probe) || probe.includes(titleText.slice(0, Math.min(24, titleText.length)))) {
        trackSalesMicroEvent("text_copy_event", {
          kind: "product_title_overlap",
          selection_length: sel.length,
        });
      }
    };
    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, []);

  useEffect(() => {
    const onVis = () => {
      trackSalesMicroEvent("tab_switch_event", {
        document_hidden: document.hidden,
        visibility_state: document.visibilityState,
      });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const root = typeof document !== "undefined" ? document.querySelector("main video") : null;
    if (!(root instanceof HTMLVideoElement)) return;
    let lastReportedPct = -1;
    const onTime = () => {
      const d = root.duration;
      if (!d || !Number.isFinite(d) || d <= 0) return;
      const pct = Math.min(100, Math.round((100 * root.currentTime) / d));
      if (pct < lastReportedPct + 4 && pct < 100) return;
      lastReportedPct = pct;
      trackSalesMicroEvent("video_percentage_watched", {
        percent: pct,
        watched_seconds: Math.round(root.currentTime),
        duration_ms: Math.round(d * 1000),
      });
    };
    root.addEventListener("timeupdate", onTime);
    root.addEventListener("ended", onTime);
    return () => {
      root.removeEventListener("timeupdate", onTime);
      root.removeEventListener("ended", onTime);
    };
  }, []);

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement)) return;
      const tag = `${t.tagName}:${t.id || ""}:${(t.className || "").toString().slice(0, 80)}`;
      const now = Date.now();
      if (rageClicks.current.target !== tag) {
        rageClicks.current = { target: tag, times: [now] };
        return;
      }
      rageClicks.current.times.push(now);
      rageClicks.current.times = rageClicks.current.times.filter((x) => now - x < 700);
      if (rageClicks.current.times.length >= 4) {
        trackSalesMicroEvent("rage_click_cluster", {
          target_summary: tag,
          clicks_in_window: rageClicks.current.times.length,
        });
        rageClicks.current.times = [];
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const bindPriceHover = useCallback(() => {
    const el = priceRef.current;
    if (!el) return () => {};
    const onEnter = () => {
      priceHoverFired.current = false;
      if (priceHoverTimer.current) clearTimeout(priceHoverTimer.current);
      priceHoverTimer.current = setTimeout(() => {
        if (!priceHoverFired.current) {
          priceHoverFired.current = true;
          trackSalesMicroEvent("price_hover_3s", {
            ms: 3000,
            detail_price: detailPrice,
          });
        }
      }, 3000);
    };
    const onLeave = () => {
      if (priceHoverTimer.current) clearTimeout(priceHoverTimer.current);
      priceHoverTimer.current = null;
      priceHoverFired.current = false;
    };
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      if (priceHoverTimer.current) clearTimeout(priceHoverTimer.current);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [detailPrice]);

  useEffect(() => bindPriceHover(), [bindPriceHover]);

  const onGalleryZoom = useCallback(() => {
    trackSalesMicroEvent("zoom_count", { delta: 1 });
  }, []);

  return { titleRef, priceRef, onGalleryZoom };
}
