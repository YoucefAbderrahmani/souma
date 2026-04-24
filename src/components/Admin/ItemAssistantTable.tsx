"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { SalesMicroEventAdminRow } from "@/types/sales-micro-analytics";
import type {
  ProductMicroAggregateRow,
  ProductMicroDetailResponse,
  ProductMicroDetailStats,
} from "@/types/sales-micro-by-product";
import { publicApiUrl } from "@/lib/public-api-url";
import { salesMicroEventCategory } from "@/lib/sales-micro-event-category";
import { extractPayloadDurationMs } from "@/lib/sales-micro-payload-duration";

const POLL_MS = 12000;

function fmtIso(iso: string | null | undefined) {
  if (!iso) return "—";
  return iso.replace("T", " ").slice(0, 23);
}

function fmtMs(ms: number | null) {
  if (ms === null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function payloadJson(p: Record<string, unknown> | null) {
  if (!p || Object.keys(p).length === 0) return "{}";
  try {
    return JSON.stringify(p);
  } catch {
    return "{}";
  }
}

function formatTopEvents(stats: ProductMicroDetailStats) {
  const entries = Object.entries(stats.byEventName).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "—";
  return entries
    .slice(0, 8)
    .map(([k, v]) => `${k} (${v})`)
    .join(" · ");
}

type Props = {
  initialAggregates: ProductMicroAggregateRow[];
};

export default function ItemAssistantTable({ initialAggregates }: Props) {
  const [aggregates, setAggregates] = useState<ProductMicroAggregateRow[]>(initialAggregates);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ProductMicroDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const mounted = useRef(true);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch(publicApiUrl("/api/admin/sales-micro-by-product?limit=200"), {
        credentials: "include",
        cache: "no-store",
      });
      if (!mounted.current) return;
      if (!res.ok) {
        setListError(res.status === 403 ? "No permission" : `Error ${res.status}`);
        return;
      }
      const data = (await res.json()) as { aggregates?: ProductMicroAggregateRow[] };
      setListError(null);
      setAggregates(data.aggregates ?? []);
      setUpdatedAt(Date.now());
    } catch {
      if (mounted.current) setListError("Network error");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      interval = setInterval(loadList, POLL_MS);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        loadList();
        start();
      } else stop();
    };
    if (document.visibilityState === "visible") {
      loadList();
      start();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [loadList]);

  const loadDetail = useCallback(async (productLocalId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(
        publicApiUrl(`/api/admin/sales-micro-by-product?productId=${productLocalId}&limit=1200`),
        { credentials: "include", cache: "no-store" }
      );
      if (!res.ok) {
        setDetailError(res.status === 404 ? "No events for this product." : `Error ${res.status}`);
        setDetail(null);
        return;
      }
      const data = (await res.json()) as ProductMicroDetailResponse;
      setDetail(data);
    } catch {
      setDetailError("Network error");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const toggle = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      setDetailError(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    void loadDetail(id);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-dark-4">
        <span>
          Products with telemetry · refresh every {POLL_MS / 1000}s when visible
          {listError ? <span className="ml-2 text-red-600">· {listError}</span> : null}
        </span>
        <span className="tabular-nums">Last refresh: {new Date(updatedAt).toLocaleTimeString()}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-3 bg-white shadow-1">
        <table className="min-w-[960px] w-full border-collapse text-left text-xs sm:text-sm">
          <thead className="border-b border-gray-3 bg-gray-1 text-[10px] font-semibold uppercase tracking-wide text-dark-4 sm:text-xs">
            <tr>
              <th className="w-10 px-2 py-2.5 sm:px-3" aria-label="Expand" />
              <th className="px-2 py-2.5 sm:px-3">Product</th>
              <th className="px-2 py-2.5 sm:px-3">ID</th>
              <th className="px-2 py-2.5 sm:px-3">Events</th>
              <th className="px-2 py-2.5 sm:px-3">Sessions</th>
              <th className="px-2 py-2.5 sm:px-3">Events / session</th>
              <th className="px-2 py-2.5 sm:px-3">First signal</th>
              <th className="px-2 py-2.5 sm:px-3">Last signal</th>
            </tr>
          </thead>
          <tbody>
            {aggregates.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-dark-4">
                  No product-scoped micro-events yet. Events must include <code className="rounded bg-gray-1 px-1">product_id</code>{" "}
                  from the tracker (browse product pages while logged activity is recorded).
                </td>
              </tr>
            ) : (
              aggregates.map((row) => {
                const open = expandedId === row.productLocalId;
                const eps = row.sessionCount > 0 ? (row.eventCount / row.sessionCount).toFixed(1) : "—";
                return (
                  <Fragment key={row.productLocalId}>
                    <tr className={`border-b border-gray-3 ${open ? "bg-[#FFF7F0]" : "bg-white hover:bg-gray-1/50"}`}>
                      <td className="px-2 py-2 align-middle sm:px-3">
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={open ? "Collapse product" : "Expand product"}
                          onClick={() => toggle(row.productLocalId)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-3 text-dark duration-200 hover:border-[#FB923C] hover:text-[#FB923C]"
                        >
                          <span className="text-lg leading-none">{open ? "▼" : "▶"}</span>
                        </button>
                      </td>
                      <td className="max-w-[280px] px-2 py-2 font-medium text-dark sm:px-3" title={row.productTitle ?? ""}>
                        {row.productTitle?.trim() || "Untitled product"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-dark-4 sm:px-3">#{row.productLocalId}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums sm:px-3">{row.eventCount}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums sm:px-3">{row.sessionCount}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums text-dark-4 sm:px-3">{eps}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-dark-4 sm:px-3">{fmtIso(row.firstEventAt)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-dark-4 sm:px-3">{fmtIso(row.lastEventAt)}</td>
                    </tr>
                    {open ? (
                      <tr className="border-b border-gray-3 bg-gray-1/30">
                        <td colSpan={8} className="px-2 py-4 sm:px-4">
                          {detailLoading ? (
                            <p className="text-sm text-dark-4">Loading analytics and raw events…</p>
                          ) : detailError ? (
                            <p className="text-sm text-red-600">{detailError}</p>
                          ) : detail ? (
                            <div className="flex flex-col gap-4">
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-lg border border-gray-3 bg-white p-3">
                                  <p className="text-[10px] font-semibold uppercase text-dark-4">Avg payload duration</p>
                                  <p className="mt-1 text-lg font-semibold text-dark">
                                    {detail.stats.avgPayloadDurationMs != null
                                      ? fmtMs(detail.stats.avgPayloadDurationMs)
                                      : "—"}
                                  </p>
                                  <p className="mt-1 text-[11px] text-dark-4">Across events with ms / value_ms / duration_ms in payload.</p>
                                </div>
                                <div className="rounded-lg border border-gray-3 bg-white p-3">
                                  <p className="text-[10px] font-semibold uppercase text-dark-4">Avg Δ after previous</p>
                                  <p className="mt-1 text-lg font-semibold text-dark">
                                    {detail.stats.avgDeltaAfterPrevMs != null
                                      ? fmtMs(detail.stats.avgDeltaAfterPrevMs)
                                      : "—"}
                                  </p>
                                  <p className="mt-1 text-[11px] text-dark-4">Within each session, time to next signal.</p>
                                </div>
                                <div className="rounded-lg border border-gray-3 bg-white p-3 sm:col-span-2 lg:col-span-2">
                                  <p className="text-[10px] font-semibold uppercase text-dark-4">Top event names</p>
                                  <p className="mt-1 text-xs leading-relaxed text-dark">
                                    {formatTopEvents(detail.stats)}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="mb-2 text-[10px] font-semibold uppercase text-dark-4">
                                  Raw events ({detail.events.length} loaded, all users)
                                </p>
                                <div className="max-h-[420px] overflow-auto rounded-lg border border-gray-3 bg-white">
                                  <table className="w-full min-w-[1100px] border-collapse text-left text-[11px]">
                                    <thead className="sticky top-0 z-[1] border-b border-gray-3 bg-gray-2 text-[10px] font-semibold uppercase text-dark-4">
                                      <tr>
                                        <th className="px-2 py-2">Time</th>
                                        <th className="px-2 py-2">Session</th>
                                        <th className="px-2 py-2">Δ prev</th>
                                        <th className="px-2 py-2">In session</th>
                                        <th className="px-2 py-2">Category</th>
                                        <th className="px-2 py-2">Event</th>
                                        <th className="px-2 py-2">Dur</th>
                                        <th className="min-w-[200px] px-2 py-2">Payload</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detail.events.map((ev: SalesMicroEventAdminRow) => {
                                        const cat = salesMicroEventCategory(ev.eventName);
                                        const dur = extractPayloadDurationMs(ev.eventName, ev.payload);
                                        return (
                                          <tr key={ev.id} className="border-b border-gray-3 last:border-0">
                                            <td className="whitespace-nowrap px-2 py-1.5 text-dark-4">
                                              {fmtIso(ev.clientEventAt ?? ev.createdAt)}
                                            </td>
                                            <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px] text-dark-4" title={ev.sessionKey}>
                                              {ev.sessionKey.slice(0, 12)}…
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{fmtMs(ev.deltaMsSincePrevious)}</td>
                                            <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{fmtMs(ev.msSinceSessionStart)}</td>
                                            <td className="max-w-[120px] truncate px-2 py-1.5" title={cat}>
                                              {cat}
                                            </td>
                                            <td className="max-w-[160px] truncate px-2 py-1.5 font-medium" title={ev.eventName}>
                                              {ev.eventName}
                                            </td>
                                            <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark-4">{fmtMs(dur)}</td>
                                            <td className="px-2 py-1.5 align-top">
                                              <pre className="max-h-20 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-dark-4">
                                                {payloadJson(ev.payload)}
                                              </pre>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-dark-4">
        Averages in the expanded panel are computed from all loaded events for that product (up to ~1.2k rows per request).
        Use <Link href="/admin/ai-sales-analyst">AI Sales Analyst</Link> for session-level JSONL export.
      </p>
    </div>
  );
}
