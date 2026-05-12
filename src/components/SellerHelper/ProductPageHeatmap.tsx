"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import type {
  ConceptionHeatmapDetailDto,
  ConceptionHeatmapMetric,
  ConceptionHeatmapPageOption,
} from "@/types/conception-heatmap";
import { productDetailsHref, productHeatmapPreviewHref } from "@/lib/product-page-link";
import {
  applyProductHeatmapPreviewFrame,
  HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX,
  mergeProductHeatmapPreviewLayout,
  measureProductHeatmapPreviewSurface,
  PRODUCT_HEATMAP_SURFACE_ATTR,
  type ProductHeatmapSurfaceMeasure,
} from "@/lib/product-heatmap-surface";
import { syncProductHeatmapOverlay } from "@/lib/product-heatmap-overlay";
import { cn } from "@/lib/utils";
import { sellerGhostButton, sellerPlaceholder, sellerToggleButton } from "./layout";

const METRICS: { id: ConceptionHeatmapMetric; label: string }[] = [
  { id: "view", label: "Views" },
  { id: "hover", label: "Hover" },
  { id: "click", label: "Clicks" },
];

const PREVIEW_FALLBACK_WIDTH_PX = HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX;
const PREVIEW_FALLBACK_HEIGHT_PX = 1800;

function createPreviewFallbackLayout(): ProductHeatmapSurfaceMeasure {
  return {
    documentWidth: PREVIEW_FALLBACK_WIDTH_PX,
    documentHeight: PREVIEW_FALLBACK_HEIGHT_PX,
    width: PREVIEW_FALLBACK_WIDTH_PX,
    height: PREVIEW_FALLBACK_HEIGHT_PX,
    offsetLeft: 0,
    offsetTop: 0,
  };
}

function toPreviewLayoutState(measure: ProductHeatmapSurfaceMeasure) {
  return {
    documentWidth: measure.documentWidth,
    documentHeight: measure.documentHeight,
    surfaceWidth: measure.width,
    surfaceHeight: measure.height,
    surfaceOffsetLeft: measure.offsetLeft,
    surfaceOffsetTop: measure.offsetTop,
  };
}

function HeatmapPagePreview({
  previewSrc,
  heatmap,
  productTitle,
}: {
  previewSrc: string;
  heatmap: ConceptionHeatmapDetailDto | null;
  productTitle: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const layoutLockedRef = useRef(false);
  const [layout, setLayout] = useState(() => toPreviewLayoutState(createPreviewFallbackLayout()));
  const [fit, setFit] = useState({
    scale: 1,
    width: PREVIEW_FALLBACK_WIDTH_PX,
    height: PREVIEW_FALLBACK_HEIGHT_PX,
  });

  const updateFit = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const availableWidth = container.clientWidth;
    const availableHeight = container.clientHeight;
    if (availableWidth <= 0 || availableHeight <= 0) return;

    const scale = Math.min(
      availableWidth / layout.surfaceWidth,
      availableHeight / layout.surfaceHeight
    );
    setFit({
      scale,
      width: layout.surfaceWidth * scale,
      height: layout.surfaceHeight * scale,
    });
  }, [layout]);

  useEffect(() => {
    layoutLockedRef.current = false;
    setLayout(toPreviewLayoutState(createPreviewFallbackLayout()));
    setFit({
      scale: 1,
      width: PREVIEW_FALLBACK_WIDTH_PX,
      height: PREVIEW_FALLBACK_HEIGHT_PX,
    });
  }, [previewSrc]);

  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.style.width = `${HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX}px`;
    iframe.style.height = `${Math.max(1, Math.round(layout.surfaceHeight))}px`;
  }, [layout.surfaceHeight, previewSrc]);

  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    const measure: ProductHeatmapSurfaceMeasure = {
      width: layout.surfaceWidth,
      height: layout.surfaceHeight,
      offsetLeft: layout.surfaceOffsetLeft,
      offsetTop: layout.surfaceOffsetTop,
      documentWidth: layout.documentWidth,
      documentHeight: layout.documentHeight,
    };

    applyProductHeatmapPreviewFrame(doc, measure);

    let cleanup = () => {};
    const frame = window.requestAnimationFrame(() => {
      cleanup = syncProductHeatmapOverlay(doc, heatmap);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      cleanup();
    };
  }, [
    heatmap,
    layout.documentHeight,
    layout.documentWidth,
    layout.surfaceHeight,
    layout.surfaceOffsetLeft,
    layout.surfaceOffsetTop,
    layout.surfaceWidth,
    previewSrc,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => updateFit());
    observer.observe(container);
    updateFit();

    return () => observer.disconnect();
  }, [updateFit]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let contentObserver: ResizeObserver | null = null;
    let syncTimer: number | null = null;
    let pollFrame = 0;
    let pollAttempts = 0;
    const maxPollAttempts = 90;

    const applyMeasuredLayout = (measured: ProductHeatmapSurfaceMeasure) => {
      setLayout((current) => {
        const currentMeasure: ProductHeatmapSurfaceMeasure = {
          width: current.surfaceWidth,
          height: current.surfaceHeight,
          offsetLeft: current.surfaceOffsetLeft,
          offsetTop: current.surfaceOffsetTop,
          documentWidth: current.documentWidth,
          documentHeight: current.documentHeight,
        };
        const merged = mergeProductHeatmapPreviewLayout(
          currentMeasure,
          measured,
          layoutLockedRef.current
        );
        layoutLockedRef.current = merged.locked;
        const next = toPreviewLayoutState(merged.layout);
        if (
          current.documentWidth === next.documentWidth &&
          current.documentHeight === next.documentHeight &&
          current.surfaceWidth === next.surfaceWidth &&
          current.surfaceHeight === next.surfaceHeight &&
          current.surfaceOffsetLeft === next.surfaceOffsetLeft &&
          current.surfaceOffsetTop === next.surfaceOffsetTop
        ) {
          return current;
        }
        return next;
      });
    };

    const syncPageSize = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const measured = measureProductHeatmapPreviewSurface(doc);
      if (!measured) return;
      applyProductHeatmapPreviewFrame(doc, measured);
      applyMeasuredLayout(measured);
    };

    const scheduleSync = () => {
      if (syncTimer != null) window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => {
        syncTimer = null;
        syncPageSize();
      }, 120);
    };

    const pollUntilReady = () => {
      if (layoutLockedRef.current || pollAttempts >= maxPollAttempts) return;
      pollAttempts += 1;
      syncPageSize();
      if (!layoutLockedRef.current) {
        pollFrame = window.requestAnimationFrame(pollUntilReady);
      }
    };

    const attachContentObserver = () => {
      contentObserver?.disconnect();
      const doc = iframe.contentDocument;
      if (!doc) return;

      const surface = doc.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null;
      if (!surface) {
        pollFrame = window.requestAnimationFrame(pollUntilReady);
        return;
      }

      contentObserver = new ResizeObserver(() => scheduleSync());
      contentObserver.observe(surface);
      syncPageSize();
      pollFrame = window.requestAnimationFrame(pollUntilReady);
    };

    const handleLoad = () => attachContentObserver();

    iframe.addEventListener("load", handleLoad);
    if (iframe.contentDocument?.readyState === "complete") {
      attachContentObserver();
    }

    return () => {
      iframe.removeEventListener("load", handleLoad);
      contentObserver?.disconnect();
      if (syncTimer != null) window.clearTimeout(syncTimer);
      window.cancelAnimationFrame(pollFrame);
    };
  }, [previewSrc]);

  const cropWidth = layout.surfaceWidth;
  const cropHeight = layout.surfaceHeight;
  const displayScale = fit.scale;

  return (
    <div
      ref={containerRef}
      className="relative h-[min(56vh,600px)] w-full overflow-hidden bg-gray-1 p-2"
    >
      <div className="flex h-full w-full items-center justify-center">
        <div
          className="relative overflow-hidden bg-white"
          style={{ width: fit.width, height: fit.height }}
        >
          <div
            className="relative overflow-hidden"
            style={{
              width: cropWidth,
              height: cropHeight,
              transform: `scale(${displayScale})`,
              transformOrigin: "top left",
            }}
          >
            <iframe
              key={previewSrc}
              ref={iframeRef}
              title={`Heatmap preview for ${productTitle}`}
              src={previewSrc}
              scrolling="no"
              className="absolute left-0 top-0 border-0 bg-white"
              style={{
                width: HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX,
                height: layout.surfaceHeight,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductPageHeatmap() {
  const [pages, setPages] = useState<ConceptionHeatmapPageOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [metric, setMetric] = useState<ConceptionHeatmapMetric>("hover");
  const [heatmap, setHeatmap] = useState<ConceptionHeatmapDetailDto | null>(null);
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPage = pages[selectedIndex] ?? null;
  const selectedProductIdRef = useRef<number | null>(null);
  selectedProductIdRef.current = selectedPage?.productId ?? null;

  const loadPages = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    if (!background) {
      setLoadingPages(true);
      setError(null);
    }
    try {
      const response = await fetch("/api/admin/conception/heatmap/pages", {
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || body.error || "Unable to load product pages.");
      }
      const nextPages = (body.pages ?? []) as ConceptionHeatmapPageOption[];
      setPages(nextPages);
      setSelectedIndex((currentIndex) => {
        const selectedProductId = selectedProductIdRef.current;
        if (selectedProductId != null) {
          const matchedIndex = nextPages.findIndex((page) => page.productId === selectedProductId);
          if (matchedIndex >= 0) return matchedIndex;
        }
        if (nextPages.length === 0) return 0;
        return Math.min(currentIndex, nextPages.length - 1);
      });
    } catch (fetchError) {
      if (!background) {
        setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
      }
    } finally {
      if (!background) setLoadingPages(false);
    }
  }, []);

  const loadHeatmap = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      const page = selectedProductIdRef.current;
      if (page == null) {
        setHeatmap(null);
        return;
      }

      if (!background) {
        setLoadingHeatmap(true);
        setError(null);
      }
      try {
        const params = new URLSearchParams({
          productId: String(page),
          metric,
        });
        const response = await fetch(`/api/admin/conception/heatmap?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.message || body.error || "Unable to load heatmap.");
        }
        setHeatmap(body.heatmap as ConceptionHeatmapDetailDto);
      } catch (fetchError) {
        if (!background) {
          setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
        }
      } finally {
        if (!background) setLoadingHeatmap(false);
      }
    },
    [metric]
  );

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (!selectedPage) {
      setHeatmap(null);
      return;
    }
    void loadHeatmap();
  }, [loadHeatmap, selectedPage]);

  const refreshLive = useCallback(async () => {
    await Promise.all([loadPages({ background: true }), loadHeatmap({ background: true })]);
  }, [loadHeatmap, loadPages]);

  useLiveDataRefresh(refreshLive);

  const previewSrc = useMemo(() => {
    if (!selectedPage) return null;
    return productHeatmapPreviewHref(selectedPage.productId);
  }, [selectedPage]);

  const livePageHref = useMemo(() => {
    if (!selectedPage) return null;
    return productDetailsHref(selectedPage.productId);
  }, [selectedPage]);

  if (loadingPages) {
    return <div className={sellerPlaceholder}>Loading product pages…</div>;
  }

  if (pages.length === 0) {
    return (
      <div className={sellerPlaceholder}>
        No product pages with interaction data yet. Visit product pages to start collecting heatmap signals.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-3 rounded-xl border border-gray-3 bg-gray-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-custom-sm font-medium text-dark">Product page</p>
            <p className="text-xs text-dark-4">
              {selectedPage?.title ?? "—"} · {selectedPage?.pagePath ?? "/shop-details"}
            </p>
          </div>
          <p className="text-xs tabular-nums text-dark-4">
            {selectedIndex + 1} / {pages.length}
          </p>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(0, pages.length - 1)}
          step={1}
          value={selectedIndex}
          onChange={(event) => setSelectedIndex(Number(event.target.value))}
          className="w-full accent-orange"
          aria-label="Select product page"
        />

        <select
          value={selectedIndex}
          onChange={(event) => setSelectedIndex(Number(event.target.value))}
          className="w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-custom-sm text-dark"
          aria-label="Product page list"
        >
          {pages.map((page, index) => (
            <option key={page.productId} value={index}>
              {page.title} · {new Intl.NumberFormat("en-US").format(page.views)} views
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-2">
          {METRICS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMetric(item.id)}
              className={sellerToggleButton(metric === item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ?
        <p className="rounded-lg border border-red-light-3 bg-red-light-6 px-4 py-3 text-custom-sm text-red-dark">
          {error}
        </p>
      : null}

      <div className="overflow-hidden rounded-xl border border-gray-3 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-3 px-4 py-3 text-xs text-dark-4">
          <span>
            {loadingHeatmap ? "Loading heatmap…" : `${heatmap?.cells.length ?? 0} active zones`}
          </span>
          <span className="tabular-nums">
            Views {new Intl.NumberFormat("en-US").format(heatmap?.totals.views ?? selectedPage?.views ?? 0)} · Hover{" "}
            {new Intl.NumberFormat("en-US").format(heatmap?.totals.hovers ?? selectedPage?.hovers ?? 0)} · Clicks{" "}
            {new Intl.NumberFormat("en-US").format(heatmap?.totals.clicks ?? selectedPage?.clicks ?? 0)}
          </span>
        </div>

        {previewSrc ?
          <HeatmapPagePreview
            previewSrc={previewSrc}
            heatmap={heatmap}
            productTitle={selectedPage?.title ?? "product"}
          />
        : null}
      </div>

      {livePageHref ?
        <a href={livePageHref} target="_blank" rel="noreferrer" className={sellerGhostButton}>
          Open live page
        </a>
      : null}
    </div>
  );
}
