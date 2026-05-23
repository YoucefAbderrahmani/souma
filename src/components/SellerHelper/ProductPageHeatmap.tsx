"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LIVE_DATA_REFRESH_MS, useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import type {
  ConceptionHeatmapDetailDto,
  ConceptionHeatmapMetric,
  ConceptionHeatmapPageOption,
} from "@/types/conception-heatmap";
import { productDetailsHref, productHeatmapPreviewHref } from "@/lib/product-page-link";
import { HeatmapPreviewFrame } from "./HeatmapPreviewFrame";
import { sellerGhostButton, sellerPlaceholder, sellerToggleButton } from "./layout";

const METRICS: { id: ConceptionHeatmapMetric; label: string }[] = [
  { id: "view", label: "Views" },
  { id: "hover", label: "Hover" },
  { id: "click", label: "Clicks" },
];

const LEGEND_GRADIENT: Record<ConceptionHeatmapMetric, string> = {
  hover: "linear-gradient(90deg, #dbeafe 0%, #60a5fa 38%, #2563eb 72%, #1e3a8a 100%)",
  click: "linear-gradient(90deg, #fef3c7 0%, #fb923c 40%, #ea580c 72%, #991b1b 100%)",
  view: "linear-gradient(90deg, #ccfbf1 0%, #2dd4bf 40%, #0d9488 72%, #064e3b 100%)",
};

function HeatmapIntensityLegend({ metric }: { metric: ConceptionHeatmapMetric }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-dark-4">
      <span>Low</span>
      <div
        className="h-2 w-28 rounded-full border border-gray-3/80"
        style={{ background: LEGEND_GRADIENT[metric] }}
        aria-hidden
      />
      <span>High</span>
      <span className="text-dark-3">· smooth density</span>
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

  useLiveDataRefresh(refreshLive, true, LIVE_DATA_REFRESH_MS);

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
        No product pages with interaction data yet.
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-3 px-4 py-3 text-xs text-dark-4">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {loadingHeatmap ?
                "Loading heatmap…"
              : `${heatmap?.cells.length ?? 0} density points · ${heatmap?.gridWidth ?? 48}×${heatmap?.gridHeight ?? 72} grid`}
            </span>
            {!loadingHeatmap && heatmap ? <HeatmapIntensityLegend metric={metric} /> : null}
          </div>
          <span className="tabular-nums">
            Views {new Intl.NumberFormat("en-US").format(heatmap?.totals.views ?? selectedPage?.views ?? 0)} · Hover{" "}
            {new Intl.NumberFormat("en-US").format(heatmap?.totals.hovers ?? selectedPage?.hovers ?? 0)} · Clicks{" "}
            {new Intl.NumberFormat("en-US").format(heatmap?.totals.clicks ?? selectedPage?.clicks ?? 0)} · refresh 5s
          </span>
        </div>

        {previewSrc ?
          <div className="relative">
            <HeatmapPreviewFrame
              previewSrc={previewSrc}
              heatmap={heatmap}
              productTitle={selectedPage?.title ?? "product"}
            />
            {!loadingHeatmap && heatmap && heatmap.cells.length === 0 ?
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 p-6 text-center text-custom-sm text-dark-4">
                No {metric} density for this product in the selected window. Try another metric or browse the live
                page to collect interactions.
              </div>
            : null}
          </div>
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
