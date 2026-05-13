"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, LineChart, RefreshCw, Search, Store } from "lucide-react";
import { readJsonResponse } from "@/lib/admin-api-response";
import { cn } from "@/lib/utils";
import {
  TIMELINE_METRIC_DEFINITIONS,
  TIMELINE_METRIC_IDS,
  TIMELINE_RANGE_DEFINITIONS,
  TIMELINE_RANGE_IDS,
  type AppliedActionDto,
  type TimelineDto,
  type TimelineMetricId,
  type TimelineProductOption,
  type TimelineRangeId,
  type TimelineScope,
  type TimelineSeriesDto,
} from "@/types/seller-helper-timeline";
import { TimelineChart } from "./charts";
import { AppliedActionDetailsModal } from "./AppliedActionDetailsModal";
import {
  sellerAccentStrip,
  sellerGhostButton,
  sellerHelperGrid,
  sellerHelperStack,
  sellerPanel,
  sellerPanelPadding,
  sellerPlaceholder,
  sellerSecondaryButton,
  sellerToggleButton,
} from "./layout";

const DEFAULT_METRICS: TimelineMetricId[] = ["views", "addToCarts", "purchases"];

const fetchOptions: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 10_000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  if (Math.abs(value) >= 1) {
    return new Intl.NumberFormat("en-US").format(Math.round(value));
  }
  return value.toFixed(2);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

function formatMetricValue(entry: TimelineSeriesDto, value: number) {
  return entry.unit === "percent" ? formatPercent(value) : formatNumber(value);
}

function metricChipClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
    active ?
      "border-orange bg-orange/10 text-orange-dark"
    : "border-gray-3 bg-white text-dark-3 hover:border-orange hover:text-orange"
  );
}

function bucketDisplayLabel(iso: string, granularity: "hour" | "day") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  if (granularity === "hour") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function TimelineContent() {
  const [range, setRange] = useState<TimelineRangeId>("24h");
  const [scope, setScope] = useState<TimelineScope>("store");
  const [metrics, setMetrics] = useState<TimelineMetricId[]>(DEFAULT_METRICS);
  const [productId, setProductId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const [timeline, setTimeline] = useState<TimelineDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productOptions, setProductOptions] = useState<TimelineProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [activeAction, setActiveAction] = useState<AppliedActionDto | null>(null);

  const requestSeqRef = useRef(0);

  const toggleMetric = useCallback((metric: TimelineMetricId) => {
    setMetrics((current) => {
      if (current.includes(metric)) {
        if (current.length === 1) return current;
        return current.filter((entry) => entry !== metric);
      }
      return [...current, metric];
    });
  }, []);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const response = await fetch("/api/admin/seller-helper/timeline/products", fetchOptions);
      const body = await readJsonResponse<{
        error?: string;
        message?: string;
        products?: TimelineProductOption[];
      }>(response, "Timeline products API");
      if (!response.ok) {
        throw new Error(body.message || body.error || "Failed to load products.");
      }
      setProductOptions(body.products ?? []);
    } catch (cause) {
      setProductsError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (scope === "product" && productOptions.length === 0 && !productsLoading) {
      void loadProducts();
    }
  }, [scope, productOptions.length, productsLoading, loadProducts]);

  const loadTimeline = useCallback(async () => {
    if (scope === "product" && !productId) {
      setTimeline(null);
      return;
    }
    const requestId = requestSeqRef.current + 1;
    requestSeqRef.current = requestId;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("range", range);
      params.set("scope", scope);
      params.set("metrics", metrics.join(","));
      if (scope === "product" && productId) params.set("productId", String(productId));

      const response = await fetch(`/api/admin/seller-helper/timeline?${params.toString()}`, fetchOptions);
      const body = await readJsonResponse<{
        error?: string;
        message?: string;
        timeline?: TimelineDto;
      }>(response, "Timeline API");
      if (!response.ok) {
        throw new Error(body.message || body.error || "Failed to load timeline.");
      }
      if (requestSeqRef.current === requestId) {
        setTimeline(body.timeline ?? null);
      }
    } catch (cause) {
      if (requestSeqRef.current === requestId) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      if (requestSeqRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [range, scope, metrics, productId]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return productOptions.slice(0, 50);
    return productOptions
      .filter((option) => option.title.toLowerCase().includes(query))
      .slice(0, 50);
  }, [productOptions, productSearch]);

  const activeRangeDef = TIMELINE_RANGE_DEFINITIONS[range];
  const selectedProduct = useMemo(
    () => productOptions.find((option) => option.productId === productId) ?? null,
    [productOptions, productId]
  );

  const scopeLabel = scope === "store" ? "Whole store" : selectedProduct ? selectedProduct.title : "Pick a product";
  const series = timeline?.series ?? [];
  const buckets = timeline?.buckets ?? [];

  const peakEntries = useMemo(() => {
    if (!timeline) return [];
    return timeline.series.map((entry) => {
      const peakBucket =
        entry.peakBucketIndex >= 0 && entry.peakBucketIndex < timeline.buckets.length ?
          timeline.buckets[entry.peakBucketIndex]
        : null;
      return {
        entry,
        peakLabel:
          peakBucket ?
            bucketDisplayLabel(peakBucket, timeline.granularity)
          : "—",
      };
    });
  }, [timeline]);

  const totalLabel = `${activeRangeDef.label} · ${scopeLabel}`;
  const showStoreMode = scope === "store";

  return (
    <div className={sellerHelperStack}>
      <div className="space-y-1">
        <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-dark">
          <LineChart className="h-5 w-5 text-orange" aria-hidden />
          Timeline
        </h3>
        <p className="text-custom-sm text-dark-4">
          Plot any combination of metrics over time. Switch between whole-store and per-product views.
        </p>
      </div>

      <div className={cn(sellerPanel, sellerPanelPadding, "space-y-4")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-dark-4">Range</span>
          <div className="flex flex-wrap gap-2">
            {TIMELINE_RANGE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setRange(id)}
                className={sellerToggleButton(range === id)}
              >
                {TIMELINE_RANGE_DEFINITIONS[id].shortLabel}
              </button>
            ))}
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-dark-4">
            <Activity className="h-3.5 w-3.5" aria-hidden />
            {activeRangeDef.bucketCount} {activeRangeDef.granularity === "hour" ? "hour" : "day"} buckets
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-dark-4">Scope</span>
          <button
            type="button"
            onClick={() => setScope("store")}
            className={sellerToggleButton(scope === "store")}
          >
            <Store className="mr-1 h-3.5 w-3.5" aria-hidden />
            Whole store
          </button>
          <button
            type="button"
            onClick={() => {
              setScope("product");
              setProductPickerOpen(true);
              if (productOptions.length === 0 && !productsLoading) {
                void loadProducts();
              }
            }}
            className={sellerToggleButton(scope === "product")}
          >
            Specific product
          </button>
          {scope === "product" ?
            <button
              type="button"
              onClick={() => setProductPickerOpen((open) => !open)}
              className={sellerSecondaryButton}
            >
              {selectedProduct ? `${selectedProduct.title}` : "Pick a product"}
            </button>
          : null}
        </div>

        {scope === "product" && productPickerOpen ?
          <div className="rounded-lg border border-gray-3 bg-white p-3">
            <label className="relative block">
              <span className="sr-only">Search products</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-4" aria-hidden />
              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search by product title"
                className="w-full rounded-lg border border-gray-3 bg-white py-2 pl-9 pr-3 text-custom-sm text-dark outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/15"
              />
            </label>
            {productsLoading ?
              <p className={cn(sellerPlaceholder, "mt-3")}>Loading products…</p>
            : productsError ?
              <p className={cn(sellerPlaceholder, "mt-3 text-red-dark")}>{productsError}</p>
            : filteredProducts.length === 0 ?
              <p className={cn(sellerPlaceholder, "mt-3")}>
                No products match your search yet.
              </p>
            : <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
                {filteredProducts.map((option) => {
                  const active = option.productId === productId;
                  return (
                    <li key={option.productId}>
                      <button
                        type="button"
                        onClick={() => {
                          setProductId(option.productId);
                          setProductPickerOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-xs",
                          active ?
                            "border-orange bg-orange/10 text-orange-dark"
                          : "border-gray-3 bg-white text-dark hover:border-orange"
                        )}
                      >
                        <span className="truncate font-medium">{option.title}</span>
                        <span className="shrink-0 text-dark-4">{formatNumber(option.views)} views</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            }
          </div>
        : null}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-dark-4">Metrics</span>
            <span className="text-xs text-dark-4">Pick what to plot — choose more than one to compare.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TIMELINE_METRIC_IDS.map((metric) => {
              const def = TIMELINE_METRIC_DEFINITIONS[metric];
              const active = metrics.includes(metric);
              return (
                <button
                  key={metric}
                  type="button"
                  onClick={() => toggleMetric(metric)}
                  className={metricChipClass(active)}
                  title={def.description}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: def.color }}
                  />
                  {def.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={cn(sellerPanel, sellerAccentStrip.orange, sellerPanelPadding)}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-base font-semibold text-dark">Performance over time</h4>
            <p className="text-xs text-dark-4">{totalLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadTimeline()}
              disabled={loading}
              className={sellerSecondaryButton}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh
            </button>
          </div>
        </div>

        {error ?
          <p className="mt-3 rounded-lg border border-red-light-3 bg-red-light-6 px-3 py-2 text-custom-sm text-red-dark">
            {error}
          </p>
        : null}

        {scope === "product" && !productId ?
          <p className={cn(sellerPlaceholder, "mt-4")}>
            Pick a product above to plot its timeline.
          </p>
        : loading && !timeline ?
          <p className={cn(sellerPlaceholder, "mt-4")}>Loading timeline…</p>
        : timeline ?
          <div className="mt-4 space-y-4">
            {timeline.hasData ?
              <TimelineChart
                buckets={buckets}
                series={series}
                granularity={timeline.granularity}
                appliedActions={timeline.appliedActions}
                onAppliedActionClick={setActiveAction}
              />
            : <div className="flex h-64 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-4 bg-gray-1 text-center text-custom-sm text-dark-4">
                <p className="font-medium text-dark">No data in this window yet.</p>
                <p>Try a wider range or come back once shoppers start interacting.</p>
              </div>
            }
          </div>
        : <p className={cn(sellerPlaceholder, "mt-4")}>Nothing to display yet.</p>
        }
      </div>

      {timeline && timeline.hasData ?
        <div className={sellerHelperGrid.three}>
          {peakEntries.map(({ entry, peakLabel }) => (
            <div key={entry.metric} className={cn(sellerPanel, sellerPanelPadding, "space-y-2")}>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <p className="text-xs font-semibold uppercase tracking-wide text-dark-4">{entry.label}</p>
              </div>
              <p className="text-2xl font-semibold tabular-nums text-dark">
                {formatMetricValue(entry, entry.total)}
              </p>
              <dl className="space-y-1 text-xs text-dark-4">
                <div className="flex items-center justify-between gap-2">
                  <dt>{entry.unit === "percent" ? "Window rate" : "Per bucket avg"}</dt>
                  <dd className="font-medium tabular-nums text-dark-3">
                    {formatMetricValue(entry, entry.average)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt>Peak</dt>
                  <dd className="font-medium tabular-nums text-dark-3">
                    {formatMetricValue(entry, entry.peak)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt>Peak bucket</dt>
                  <dd className="font-medium text-dark-3">{peakLabel}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      : null}

      <p className="text-xs text-dark-4">
        Tip: combine a volume metric (e.g. {showStoreMode ? "views" : "product views"}) with a rate metric (e.g. conversion rate) to spot when traffic moves but conversion does not.{" "}
        <button type="button" onClick={() => void loadProducts()} className={cn(sellerGhostButton, "ml-1 inline-flex h-auto px-0 py-0 text-xs underline")}>
          Re-sync product list
        </button>
      </p>

      <AppliedActionDetailsModal action={activeAction} onClose={() => setActiveAction(null)} />
    </div>
  );
}
