"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SalesMicroSessionAdmin } from "@/types/sales-micro-analytics";
import { publicApiUrl } from "@/lib/public-api-url";
import { salesMicroEventCategory, SALES_MICRO_CATEGORY_OPTIONS } from "@/lib/sales-micro-event-category";
import { extractPayloadDurationMs } from "@/lib/sales-micro-payload-duration";
import {
  filterSessionsForTable,
  modelRowsToCsv,
  modelRowsToJsonArray,
  modelRowsToJsonl,
  SALES_MICRO_SCHEMA_VERSION,
  sessionsToModelRows,
} from "@/lib/sales-micro-ai-export";
import ProductAnalyticsTrackingPanel from "@/components/Admin/ProductAnalyticsTrackingPanel";

const POLL_MS = 5000;
const COL_COUNT = 15;

function fmtIso(iso: string | null | undefined) {
  if (!iso) return "—";
  return iso.replace("T", " ").slice(0, 23);
}

function fmtMs(ms: number | null) {
  if (ms === null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  const m = Math.floor(ms / 60_000);
  const s = ((ms % 60_000) / 1000).toFixed(0);
  return `${m}m ${s}s`;
}

function payloadJson(p: Record<string, unknown> | null) {
  if (!p || Object.keys(p).length === 0) return "—";
  try {
    return JSON.stringify(p);
  } catch {
    return "—";
  }
}

function flattenPreview(payload: Record<string, unknown> | null, max = 140): string {
  if (!payload || Object.keys(payload).length === 0) return "—";
  try {
    const flat = Object.keys(payload)
      .sort()
      .map((k) => {
        const v = payload[k];
        const s =
          v !== null && typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
        return `${k}=${s}`;
      })
      .join("; ");
    return flat.length > max ? `${flat.slice(0, max)}…` : flat;
  } catch {
    return "—";
  }
}

function downloadText(filename: string, text: string, mime: string, utf8Bom = false) {
  const blob = utf8Bom ? new Blob(["\ufeff", text], { type: mime }) : new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  initialSessions: SalesMicroSessionAdmin[];
};

export default function AiSalesAnalystEventsTable({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<SalesMicroSessionAdmin[]>(initialSessions);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [exportHint, setExportHint] = useState<string | null>(null);
  const mounted = useRef(true);

  const visibleSessions = useMemo(
    () => filterSessionsForTable(sessions, category, query),
    [sessions, category, query]
  );

  const modelRows = useMemo(() => sessionsToModelRows(visibleSessions), [visibleSessions]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(publicApiUrl("/api/admin/sales-micro-events?maxSessions=200"), {
        credentials: "include",
        cache: "no-store",
      });
      if (!mounted.current) return;
      if (!res.ok) {
        let detail = "";
        try {
          const body = (await res.json()) as { message?: string; error?: string };
          detail = body.message || body.error || "";
        } catch {
          /* ignore */
        }
        setFetchError(
          res.status === 403
            ? "No permission"
            : res.status === 500 && detail
              ? detail
              : `Error ${res.status}`
        );
        return;
      }
      const data = (await res.json()) as { sessions?: SalesMicroSessionAdmin[] };
      setFetchError(null);
      setSessions(data.sessions ?? []);
      setUpdatedAt(Date.now());
    } catch {
      if (mounted.current) setFetchError("Network error");
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
    const startPolling = () => {
      if (interval) return;
      interval = setInterval(load, POLL_MS);
    };
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        load();
        startPolling();
      } else {
        stopPolling();
      }
    };
    if (document.visibilityState === "visible") {
      load();
      startPolling();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopPolling();
    };
  }, [load]);

  const stamp = useMemo(() => new Date().toISOString().slice(0, 19).replace(/:/g, "-"), []);

  const onCopyJsonl = useCallback(async () => {
    const text = modelRowsToJsonl(modelRows);
    try {
      await navigator.clipboard.writeText(text);
      setExportHint(`Copied ${modelRows.length} lines (JSONL) to clipboard.`);
    } catch {
      setExportHint("Clipboard blocked — use Download JSONL instead.");
    }
    setTimeout(() => setExportHint(null), 4000);
  }, [modelRows]);

  return (
    <div>
      <ProductAnalyticsTrackingPanel />
      <div className="mb-4 rounded-lg border border-gray-3 bg-white p-4 shadow-1">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex flex-col gap-1 text-xs font-medium text-dark">
              Search
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Session, event, product, path…"
                className="min-w-[200px] rounded-md border border-gray-3 px-3 py-2 text-sm text-dark outline-none placeholder:text-stone-500 focus:border-[#FB923C] focus:outline-none focus-visible:outline-none focus-visible:ring-0"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-dark">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="min-w-[180px] rounded-md border border-gray-3 bg-white px-3 py-2 text-sm text-dark outline-none focus:border-[#FB923C] focus:outline-none focus-visible:outline-none focus-visible:ring-0"
              >
                <option value="">All categories</option>
                {SALES_MICRO_CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopyJsonl}
              className="rounded-md border border-gray-3 bg-white px-3 py-2 text-xs font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C] sm:text-sm"
            >
              Copy JSONL
            </button>
            <button
              type="button"
              onClick={() =>
                downloadText(`sales-micro-${stamp}.jsonl`, modelRowsToJsonl(modelRows), "application/x-ndjson;charset=utf-8")
              }
              className="rounded-md border border-gray-3 bg-white px-3 py-2 text-xs font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C] sm:text-sm"
            >
              JSONL
            </button>
            <button
              type="button"
              onClick={() =>
                downloadText(
                  `sales-micro-${stamp}.json`,
                  modelRowsToJsonArray(modelRows),
                  "application/json;charset=utf-8"
                )
              }
              className="rounded-md border border-gray-3 bg-white px-3 py-2 text-xs font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C] sm:text-sm"
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() =>
                downloadText(`sales-micro-${stamp}.csv`, modelRowsToCsv(modelRows), "text/csv;charset=utf-8", true)
              }
              className="rounded-md border border-gray-3 bg-white px-3 py-2 text-xs font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C] sm:text-sm"
            >
              CSV
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-dark-4">
          <strong className="text-dark">Model schema:</strong>{" "}
          <code className="rounded bg-gray-1 px-1">{SALES_MICRO_SCHEMA_VERSION}</code> — each JSONL line is one event with
          stable snake_case keys, <code className="rounded bg-gray-1 px-1">payload_json</code> (object) and{" "}
          <code className="rounded bg-gray-1 px-1">payload_flat</code> (sorted <code className="rounded bg-gray-1 px-1">k=v</code> pairs).
          Exports respect the filters above ({modelRows.length} row{modelRows.length === 1 ? "" : "s"}).
        </p>
        {exportHint ? <p className="mt-2 text-xs text-[#FB923C]">{exportHint}</p> : null}
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-dark-4">
        <span>
          Showing {visibleSessions.length} session{visibleSessions.length === 1 ? "" : "s"} · up to 200 loaded · refresh every{" "}
          {POLL_MS / 1000}s when visible
          {fetchError ? <span className="ml-2 text-red-600">· {fetchError}</span> : null}
        </span>
        <span className="tabular-nums">Last refresh: {new Date(updatedAt).toLocaleTimeString()}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-3 bg-white shadow-1">
        <table className="min-w-[2000px] w-full border-collapse text-left text-[11px] sm:text-xs">
          <thead className="sticky top-0 z-20 border-b border-gray-3 bg-gray-1 text-[10px] font-semibold uppercase tracking-wide text-dark-4 sm:text-xs">
            <tr className="border-b border-gray-3 bg-gray-2/80">
              <th colSpan={1} className="px-2 py-1.5 sm:px-3">
                Session
              </th>
              <th colSpan={5} className="px-2 py-1.5 text-center sm:px-3">
                Timing
              </th>
              <th colSpan={2} className="px-2 py-1.5 text-center sm:px-3">
                Event
              </th>
              <th colSpan={5} className="px-2 py-1.5 text-center sm:px-3">
                Context
              </th>
              <th colSpan={2} className="px-2 py-1.5 text-center sm:px-3">
                Payload
              </th>
            </tr>
            <tr>
              <th className="sticky left-0 z-10 min-w-[120px] border-r border-gray-3 bg-gray-1 px-2 py-2.5 sm:px-3">
                Key / #
              </th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Δ prev</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">From start</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Duration</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Client</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Server</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Category</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Name</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">User</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Product</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Page</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Referrer</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Seq</th>
              <th className="min-w-[200px] px-2 py-2.5 sm:px-3">Flat</th>
              <th className="min-w-[280px] px-2 py-2.5 sm:px-3">JSON</th>
            </tr>
          </thead>
          <tbody>
            {visibleSessions.length === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className="px-3 py-12 text-center text-dark-4">
                  No rows match filters, or no micro-events yet. Clear filters or apply migration{" "}
                  <code className="rounded bg-gray-1 px-1">0003_sales_micro_event</code>.
                </td>
              </tr>
            ) : (
              visibleSessions.map((session) => (
                <Fragment key={session.sessionKey}>
                  <tr className="border-b border-gray-3 bg-[#FFF7F0] text-dark">
                    <td colSpan={COL_COUNT} className="px-2 py-2.5 sm:px-3">
                      <span className="font-mono text-[11px] font-semibold sm:text-xs">{session.sessionKey}</span>
                      <span className="mx-2 text-dark-4">·</span>
                      <span className="text-dark-4">
                        {session.eventCount} events · wall {fmtMs(session.sessionDurationMs)} ·{" "}
                        {session.userId ? (
                          <span className="font-mono text-[11px] text-dark">{session.userId.slice(0, 14)}…</span>
                        ) : (
                          "guest"
                        )}{" "}
                        · {fmtIso(session.firstEventAt)} → {fmtIso(session.lastEventAt)}
                      </span>
                    </td>
                  </tr>
                  {session.events.map((ev, idx) => {
                    const cat = salesMicroEventCategory(ev.eventName);
                    const dur = extractPayloadDurationMs(ev.eventName, ev.payload);
                    const flat = flattenPreview(ev.payload);
                    return (
                      <tr
                        key={ev.id}
                        className={`border-b border-gray-3 last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-1/40"}`}
                      >
                        <td
                          className={`sticky left-0 z-[1] max-w-[140px] border-r border-gray-3 px-2 py-1.5 align-top font-mono text-[10px] sm:px-3 sm:text-xs ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-1/90"
                          }`}
                          title={session.sessionKey}
                        >
                          <div className="truncate text-dark-4">{session.sessionKey.slice(0, 14)}…</div>
                          <div className="tabular-nums text-dark-4">#{idx + 1}</div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark sm:px-3">
                          {fmtMs(ev.deltaMsSincePrevious)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark sm:px-3">
                          {fmtMs(ev.msSinceSessionStart)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark-4 sm:px-3">{fmtMs(dur)}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-dark sm:px-3">{fmtIso(ev.clientEventAt)}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-dark-4 sm:px-3">{fmtIso(ev.createdAt)}</td>
                        <td className="max-w-[130px] truncate px-2 py-1.5 text-dark sm:px-3" title={cat}>
                          {cat}
                        </td>
                        <td className="max-w-[180px] truncate px-2 py-1.5 font-medium text-dark sm:px-3" title={ev.eventName}>
                          {ev.eventName}
                        </td>
                        <td className="max-w-[90px] truncate px-2 py-1.5 font-mono text-[10px] text-dark-4 sm:px-3" title={ev.userId ?? ""}>
                          {ev.userId ? `${ev.userId.slice(0, 8)}…` : "—"}
                        </td>
                        <td className="max-w-[140px] truncate px-2 py-1.5 text-dark-4 sm:px-3" title={ev.productTitle ?? ""}>
                          {ev.productLocalId != null ? `#${ev.productLocalId} ` : ""}
                          {ev.productTitle ? ev.productTitle.slice(0, 40) : "—"}
                        </td>
                        <td className="max-w-[120px] truncate px-2 py-1.5 text-dark-4 sm:px-3" title={ev.pagePath}>
                          {ev.pagePath}
                        </td>
                        <td className="max-w-[120px] truncate px-2 py-1.5 text-dark-4 sm:px-3" title={ev.referrer ?? ""}>
                          {ev.referrer ? ev.referrer.slice(0, 48) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark-4 sm:px-3">{ev.sequenceIndex}</td>
                        <td className="max-w-[220px] px-2 py-1.5 align-top text-[10px] leading-snug text-dark-4 sm:px-3" title={flat}>
                          {flat}
                        </td>
                        <td className="max-w-[360px] px-2 py-1.5 align-top sm:px-3">
                          <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-snug text-dark-4">
                            {payloadJson(ev.payload)}
                          </pre>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-dark-4">
        <strong className="font-medium text-dark">Duration</strong> uses payload fields such as{" "}
        <code className="rounded bg-gray-1 px-1">ms</code>, <code className="rounded bg-gray-1 px-1">value_ms</code>,{" "}
        <code className="rounded bg-gray-1 px-1">duration_ms</code> when present. For batch LLM jobs, prefer{" "}
        <strong className="text-dark">JSONL</strong> (one JSON object per line).
      </p>
    </div>
  );
}
