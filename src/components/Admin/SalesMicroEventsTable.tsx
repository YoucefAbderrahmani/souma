"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { SalesMicroSessionAdmin } from "@/types/sales-micro-analytics";

const POLL_MS = 4000;

function fmtIso(iso: string | null | undefined) {
  if (!iso) return "—";
  return iso.replace("T", " ").slice(0, 23);
}

function fmtMs(ms: number | null) {
  if (ms === null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  const m = Math.floor(ms / 60_000);
  const s = ((ms % 60_000) / 1000).toFixed(0);
  return `${m}m ${s}s`;
}

function payloadPreview(p: Record<string, unknown> | null) {
  if (!p || Object.keys(p).length === 0) return "—";
  try {
    const s = JSON.stringify(p);
    return s.length > 180 ? `${s.slice(0, 180)}…` : s;
  } catch {
    return "—";
  }
}

type Props = {
  initialSessions: SalesMicroSessionAdmin[];
};

export default function SalesMicroEventsTable({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<SalesMicroSessionAdmin[]>(initialSessions);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sales-micro-events", {
        credentials: "include",
        cache: "no-store",
      });
      if (!mounted.current) return;
      if (!res.ok) {
        setFetchError(res.status === 403 ? "No permission" : `Error ${res.status}`);
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
          Updates every {POLL_MS / 1000}s while this tab is visible
          {fetchError ? <span className="ml-2 text-red-600">· {fetchError}</span> : null}
        </span>
        <span className="tabular-nums">Last refresh: {new Date(updatedAt).toLocaleTimeString()}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-3 bg-white shadow-1">
        <table className="min-w-[1400px] w-full border-collapse text-left text-xs sm:text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-3 bg-gray-1 text-[10px] font-semibold uppercase tracking-wide text-dark-4 sm:text-xs">
            <tr>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Session</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">#</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Client time</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Server time</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Δ prev</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">From start</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Event</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Product</th>
              <th className="whitespace-nowrap px-2 py-2.5 sm:px-3">Page</th>
              <th className="min-w-[280px] px-2 py-2.5 sm:px-3">Payload</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-12 text-center text-dark-4">
                  No micro-events recorded yet. Ensure migration <code className="rounded bg-gray-1 px-1">0003_sales_micro_event</code> is applied and
                  browse the shop as a visitor.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <Fragment key={session.sessionKey}>
                  <tr className="border-b border-gray-3 bg-[#FFF7F0] text-dark">
                    <td colSpan={10} className="px-2 py-2.5 sm:px-3">
                      <span className="font-mono text-[11px] font-semibold sm:text-xs">{session.sessionKey}</span>
                      <span className="mx-2 text-dark-4">·</span>
                      <span className="text-dark-4">
                        {session.eventCount} events · wall {fmtMs(session.sessionDurationMs)} · user{" "}
                        {session.userId ? (
                          <span className="font-mono text-[11px] text-dark">{session.userId.slice(0, 12)}…</span>
                        ) : (
                          "guest"
                        )}{" "}
                        · first {fmtIso(session.firstEventAt)} → last {fmtIso(session.lastEventAt)}
                      </span>
                    </td>
                  </tr>
                  {session.events.map((ev, idx) => (
                    <tr
                      key={ev.id}
                      className={`border-b border-gray-3 last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-1/40"}`}
                    >
                      <td className="max-w-[120px] truncate px-2 py-1.5 font-mono text-[10px] text-dark-4 sm:px-3 sm:text-xs" title={session.sessionKey}>
                        {session.sessionKey.slice(0, 10)}…
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark-4 sm:px-3">{idx + 1}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-dark sm:px-3">{fmtIso(ev.clientEventAt)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-dark-4 sm:px-3">{fmtIso(ev.createdAt)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark sm:px-3">{fmtMs(ev.deltaMsSincePrevious)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-dark sm:px-3">{fmtMs(ev.msSinceSessionStart)}</td>
                      <td className="max-w-[200px] truncate px-2 py-1.5 font-medium text-dark sm:px-3" title={ev.eventName}>
                        {ev.eventName}
                      </td>
                      <td className="max-w-[160px] truncate px-2 py-1.5 text-dark-4 sm:px-3" title={ev.productTitle ?? ""}>
                        {ev.productLocalId != null ? `#${ev.productLocalId} ` : ""}
                        {ev.productTitle ? ev.productTitle.slice(0, 40) : "—"}
                      </td>
                      <td className="max-w-[140px] truncate px-2 py-1.5 text-dark-4 sm:px-3" title={ev.pagePath}>
                        {ev.pagePath}
                      </td>
                      <td className="max-w-[420px] truncate px-2 py-1.5 font-mono text-[10px] text-dark-4 sm:px-3 sm:text-xs" title={payloadPreview(ev.payload)}>
                        {payloadPreview(ev.payload)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
