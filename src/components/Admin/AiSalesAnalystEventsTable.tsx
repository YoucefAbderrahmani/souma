"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { SalesMicroSessionAdmin } from "@/types/sales-micro-analytics";
import { publicApiUrl } from "@/lib/public-api-url";
import { salesMicroEventCategory } from "@/lib/sales-micro-event-category";
import { extractPayloadDurationMs } from "@/lib/sales-micro-payload-duration";

const POLL_MS = 5000;

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

type Props = {
  initialSessions: SalesMicroSessionAdmin[];
};

export default function AiSalesAnalystEventsTable({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<SalesMicroSessionAdmin[]>(initialSessions);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const mounted = useRef(true);

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

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-dark-4">
        <span>
          Flat view: up to 200 recent sessions · refresh every {POLL_MS / 1000}s when visible
          {fetchError ? <span className="ml-2 text-red-600">· {fetchError}</span> : null}
        </span>
        <span className="tabular-nums">Last refresh: {new Date(updatedAt).toLocaleTimeString()}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-3 bg-white shadow-1">
        <table className="min-w-[2400px] w-full border-collapse text-left text-[11px] sm:text-xs">
          <thead className="sticky top-0 z-10 border-b border-gray-3 bg-gray-1 text-[10px] font-semibold uppercase tracking-wide text-dark-4 sm:text-xs">
            <tr>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Session</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Row #</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Category</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Event</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Client time</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Server time</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Δ after prev</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">From session start</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Payload duration</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Session wall</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">User</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Product</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Page</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Referrer</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Seq</th>
              <th className="min-w-[360px] px-2 py-2.5 sm:px-3">Payload (full)</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-3 py-12 text-center text-dark-4">
                  No micro-events yet. Apply migration <code className="rounded bg-gray-1 px-1">0003_sales_micro_event</code> and browse the shop.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <Fragment key={session.sessionKey}>
                  <tr className="border-b border-gray-3 bg-[#FFF7F0] text-dark">
                    <td colSpan={16} className="px-2 py-2.5 sm:px-3">
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
                    const category = salesMicroEventCategory(ev.eventName);
                    const dur = extractPayloadDurationMs(ev.eventName, ev.payload);
                    return (
                      <tr
                        key={ev.id}
                        className={`border-b border-gray-3 last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-1/40"}`}
                      >
                        <td
                          className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px] text-dark-4 sm:px-3 sm:text-xs"
                          title={session.sessionKey}
                        >
                          {session.sessionKey.slice(0, 12)}…
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark-4 sm:px-3">{idx + 1}</td>
                        <td className="max-w-[140px] truncate px-2 py-1.5 text-dark sm:px-3" title={category}>
                          {category}
                        </td>
                        <td className="max-w-[200px] truncate px-2 py-1.5 font-medium text-dark sm:px-3" title={ev.eventName}>
                          {ev.eventName}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-dark sm:px-3">{fmtIso(ev.clientEventAt)}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-dark-4 sm:px-3">{fmtIso(ev.createdAt)}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark sm:px-3">
                          {fmtMs(ev.deltaMsSincePrevious)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark sm:px-3">
                          {fmtMs(ev.msSinceSessionStart)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark-4 sm:px-3">{fmtMs(dur)}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark-4 sm:px-3">
                          {fmtMs(session.sessionDurationMs)}
                        </td>
                        <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px] text-dark-4 sm:px-3" title={ev.userId ?? ""}>
                          {ev.userId ? `${ev.userId.slice(0, 10)}…` : "—"}
                        </td>
                        <td className="max-w-[160px] truncate px-2 py-1.5 text-dark-4 sm:px-3" title={ev.productTitle ?? ""}>
                          {ev.productLocalId != null ? `#${ev.productLocalId} ` : ""}
                          {ev.productTitle ? ev.productTitle.slice(0, 48) : "—"}
                        </td>
                        <td className="max-w-[140px] truncate px-2 py-1.5 text-dark-4 sm:px-3" title={ev.pagePath}>
                          {ev.pagePath}
                        </td>
                        <td className="max-w-[160px] truncate px-2 py-1.5 text-dark-4 sm:px-3" title={ev.referrer ?? ""}>
                          {ev.referrer ? ev.referrer.slice(0, 80) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark-4 sm:px-3">{ev.sequenceIndex}</td>
                        <td className="max-w-[520px] px-2 py-1.5 align-top sm:px-3">
                          <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-snug text-dark-4">
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
        <strong className="font-medium text-dark">Payload duration</strong> reads <code className="rounded bg-gray-1 px-1">ms</code>,{" "}
        <code className="rounded bg-gray-1 px-1">value_ms</code>, <code className="rounded bg-gray-1 px-1">duration_ms</code>, or video / page-load
        fields when present. <strong className="font-medium text-dark">Δ after prev</strong> is wall time since the previous event in the same session.
      </p>
    </div>
  );
}
