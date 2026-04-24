"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { SalesMicroEventAdminRow } from "@/types/sales-micro-analytics";
import type {
  ProductMicroAggregateRow,
  ProductMicroDetailResponse,
  ProductMicroSequenceSlice,
} from "@/types/sales-micro-by-product";
import { publicApiUrl } from "@/lib/public-api-url";
import { salesMicroEventCategory } from "@/lib/sales-micro-event-category";
import { extractPayloadDurationMs } from "@/lib/sales-micro-payload-duration";

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

function formatTopEvents(byEventName: Record<string, number>) {
  const entries = Object.entries(byEventName).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "—";
  return entries
    .slice(0, 8)
    .map(([k, v]) => `${k} (${v})`)
    .join(" · ");
}

/** Sum of per-sequence counts for each event name, divided by number of sequences. */
function formatTopEventsAvgPerSequence(sequences: ProductMicroSequenceSlice[]) {
  const n = sequences.length;
  if (n === 0) return "—";
  const totals: Record<string, number> = {};
  for (const s of sequences) {
    for (const [name, c] of Object.entries(s.byEventName)) {
      totals[name] = (totals[name] ?? 0) + c;
    }
  }
  const entries = Object.entries(totals)
    .map(([k, sum]) => [k, sum / n] as const)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "—";
  return entries
    .slice(0, 8)
    .map(([k, avg]) => `${k} (${avg.toFixed(2)})`)
    .join(" · ");
}

/** Headline averages across every product-phase event in all listed sequence slices. */
function pooledAcrossSlices(sequences: ProductMicroSequenceSlice[]) {
  const all = sequences.flatMap((s) => s.events);
  const n = sequences.length;
  const durations: number[] = [];
  const deltas: number[] = [];
  for (const ev of all) {
    const d = extractPayloadDurationMs(ev.eventName, ev.payload);
    if (d != null) durations.push(d);
    if (ev.deltaMsSincePrevious != null) deltas.push(ev.deltaMsSincePrevious);
  }
  const meanRounded = (nums: number[]) =>
    nums.length === 0 ? null : Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  return {
    avgPayloadDurationMs: meanRounded(durations),
    avgDeltaAfterPrevMs: meanRounded(deltas),
    shoppingSequencesCount: n,
    avgEventsPerSequence: n > 0 ? all.length / n : 0,
  };
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
    void loadList();
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
          Products with telemetry
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
                            <p className="text-sm text-dark-4">Loading per-sequence analytics…</p>
                          ) : detailError ? (
                            <p className="text-sm text-red-600">{detailError}</p>
                          ) : detail ? (
                            <div className="flex flex-col gap-4">
                              <p className="text-xs text-dark-4">
                                Durations pool all product-phase events. Event totals are shown as <strong>averages per sequence</strong>{" "}
                                (divide by the number of funnel rows below). Each lower card is one{" "}
                                <code className="rounded bg-gray-1 px-0.5">shopping_sequence</code> (after{" "}
                                <code className="rounded bg-gray-1 px-0.5">product_visited_at</code> until ended).
                              </p>
                              {detail.sequences.length === 0 ? (
                                <p className="text-sm text-dark-4">
                                  No funnel rows with <code className="rounded bg-gray-1 px-0.5">product_visited_at</code> for these
                                  sessions, or telemetry never fell in a product-phase window. Ensure{" "}
                                  <code className="rounded bg-gray-1 px-0.5">/api/sequence/visit-product</code> runs when users open a
                                  product page.
                                </p>
                              ) : (
                                <>
                                  {(() => {
                                    const pool = pooledAcrossSlices(detail.sequences);
                                    return (
                                      <div className="flex flex-col gap-3">
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                          <div className="rounded-lg border border-gray-3 bg-white p-3">
                                            <p className="text-[10px] font-semibold uppercase text-dark-4">Pooled payload duration</p>
                                            <p className="mt-1 text-lg font-semibold text-dark">
                                              {pool.avgPayloadDurationMs != null ? fmtMs(pool.avgPayloadDurationMs) : "—"}
                                            </p>
                                            <p className="mt-1 text-[11px] text-dark-4">
                                              Mean of payload durations (ms / duration_ms / etc.) across{" "}
                                              <strong>all</strong> product-phase events in every sequence slice shown.
                                            </p>
                                          </div>
                                          <div className="rounded-lg border border-gray-3 bg-white p-3">
                                            <p className="text-[10px] font-semibold uppercase text-dark-4">Pooled Δ after previous</p>
                                            <p className="mt-1 text-lg font-semibold text-dark">
                                              {pool.avgDeltaAfterPrevMs != null ? fmtMs(pool.avgDeltaAfterPrevMs) : "—"}
                                            </p>
                                            <p className="mt-1 text-[11px] text-dark-4">
                                              Mean time to the next signal, using each slice’s recomputed timeline, pooled across
                                              every event in those slices.
                                            </p>
                                          </div>
                                          <div className="rounded-lg border border-gray-3 bg-white p-3">
                                            <p className="text-[10px] font-semibold uppercase text-dark-4">Avg events per sequence</p>
                                            <p className="mt-1 text-lg font-semibold text-dark">
                                              {pool.shoppingSequencesCount > 0
                                                ? pool.avgEventsPerSequence.toFixed(2)
                                                : "—"}
                                            </p>
                                            <p className="mt-1 text-[11px] text-dark-4">
                                              Total product-phase events ÷{" "}
                                              <span className="font-medium text-dark">{pool.shoppingSequencesCount}</span>{" "}
                                              <code className="rounded bg-gray-1 px-0.5">shopping_sequence</code> rows (with{" "}
                                              <code className="rounded bg-gray-1 px-0.5">product_visited_at</code>) in this view.
                                            </p>
                                          </div>
                                        </div>
                                        <div className="rounded-lg border border-gray-3 bg-white p-3">
                                          <p className="text-[10px] font-semibold uppercase text-dark-4">
                                            Top signals (avg count per sequence)
                                          </p>
                                          <p className="mt-1 text-xs leading-relaxed text-dark">
                                            {formatTopEventsAvgPerSequence(detail.sequences)}
                                          </p>
                                          <p className="mt-1 text-[11px] text-dark-4">
                                            For each event name: (sum of counts across sequences) ÷ number of sequences. Sequences
                                            with zero of that event count as 0 in the average.
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {detail.sequences.map((seq: ProductMicroSequenceSlice) => (
                                  <div
                                    key={seq.sequenceId}
                                    className="rounded-lg border border-gray-3 bg-white p-3 shadow-1 sm:p-4"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-3 pb-3">
                                      <div>
                                        <p className="text-[10px] font-semibold uppercase text-dark-4">Sequence</p>
                                        <p className="font-mono text-xs text-dark">{seq.sequenceId.slice(0, 8)}…</p>
                                        <p className="mt-1 text-[11px] text-dark-4">
                                          Session <span className="font-mono">{seq.sessionKey.slice(0, 14)}…</span> ·{" "}
                                          <span className="font-medium text-dark">{seq.status}</span> · {seq.triggerType}:{" "}
                                          <span className="line-clamp-2" title={seq.triggerLabel}>
                                            {seq.triggerLabel}
                                          </span>
                                        </p>
                                      </div>
                                      <div className="text-right text-[11px] text-dark-4">
                                        <div>Started {fmtIso(seq.startedAt)}</div>
                                        <div>Product visit {fmtIso(seq.productVisitedAt)}</div>
                                        <div>Ended {fmtIso(seq.endedAt)}</div>
                                      </div>
                                    </div>

                                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                      <div className="rounded-md border border-gray-3 bg-gray-1/40 p-2">
                                        <p className="text-[10px] font-semibold uppercase text-dark-4">Events in slice</p>
                                        <p className="text-lg font-semibold text-dark">{seq.eventCount}</p>
                                        <p className="mt-0.5 text-[10px] text-dark-4">Count for this sequence only</p>
                                      </div>
                                      <div className="rounded-md border border-gray-3 bg-gray-1/40 p-2">
                                        <p className="text-[10px] font-semibold uppercase text-dark-4">Slice avg payload</p>
                                        <p className="text-lg font-semibold text-dark">
                                          {seq.avgPayloadDurationMs != null ? fmtMs(seq.avgPayloadDurationMs) : "—"}
                                        </p>
                                      </div>
                                      <div className="rounded-md border border-gray-3 bg-gray-1/40 p-2">
                                        <p className="text-[10px] font-semibold uppercase text-dark-4">Slice avg Δ prev</p>
                                        <p className="text-lg font-semibold text-dark">
                                          {seq.avgDeltaAfterPrevMs != null ? fmtMs(seq.avgDeltaAfterPrevMs) : "—"}
                                        </p>
                                      </div>
                                    </div>

                                    <p className="mt-3 text-[10px] font-semibold uppercase text-dark-4">Top signals (counts, this sequence)</p>
                                    <p className="mt-1 text-xs leading-relaxed text-dark">{formatTopEvents(seq.byEventName)}</p>

                                    <p className="mt-3 text-[10px] font-semibold uppercase text-dark-4">
                                      Raw events ({seq.eventCount} in this sequence slice)
                                    </p>
                                    <div className="mt-1 max-h-[220px] overflow-auto rounded-md border border-gray-3">
                                      <table className="w-full min-w-[900px] border-collapse text-left text-[11px]">
                                        <thead className="sticky top-0 bg-gray-2 text-[10px] font-semibold uppercase text-dark-4">
                                          <tr>
                                            <th className="px-2 py-1.5">Time</th>
                                            <th className="px-2 py-1.5">Δ prev</th>
                                            <th className="px-2 py-1.5">In session</th>
                                            <th className="px-2 py-1.5">Category</th>
                                            <th className="px-2 py-1.5">Event</th>
                                            <th className="px-2 py-1.5">Dur</th>
                                            <th className="min-w-[160px] px-2 py-1.5">Payload</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {seq.events.map((ev: SalesMicroEventAdminRow) => {
                                            const cat = salesMicroEventCategory(ev.eventName);
                                            const dur = extractPayloadDurationMs(ev.eventName, ev.payload);
                                            return (
                                              <tr key={ev.id} className="border-t border-gray-3">
                                                <td className="whitespace-nowrap px-2 py-1 text-dark-4">
                                                  {fmtIso(ev.clientEventAt ?? ev.createdAt)}
                                                </td>
                                                <td className="whitespace-nowrap px-2 py-1 tabular-nums">
                                                  {fmtMs(ev.deltaMsSincePrevious)}
                                                </td>
                                                <td className="whitespace-nowrap px-2 py-1 tabular-nums">
                                                  {fmtMs(ev.msSinceSessionStart)}
                                                </td>
                                                <td className="max-w-[100px] truncate px-2 py-1" title={cat}>
                                                  {cat}
                                                </td>
                                                <td className="max-w-[140px] truncate px-2 py-1 font-medium" title={ev.eventName}>
                                                  {ev.eventName}
                                                </td>
                                                <td className="whitespace-nowrap px-2 py-1 tabular-nums text-dark-4">
                                                  {fmtMs(dur)}
                                                </td>
                                                <td className="px-2 py-1 align-top">
                                                  <pre className="max-h-16 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-dark-4">
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
                                  ))}
                                </>
                              )}
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
        Headline duration metrics pool all product-phase events. Event counts use <strong>average per sequence</strong> (totals ÷
        number of sequences). Each lower card is one <code className="rounded bg-gray-1 px-0.5">shopping_sequence</code>. Use{" "}
        <Link href="/admin/ai-sales-analyst">AI Sales Analyst</Link> for full-session JSONL export.
      </p>
    </div>
  );
}
