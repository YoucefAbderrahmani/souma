"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ShoppingSequenceDTO } from "@/types/shopping-sequence";
import { publicApiUrl } from "@/lib/public-api-url";

const POLL_MS = 3000;

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return iso.replace("T", " ").slice(0, 19);
}

type Props = {
  initialSequences: ShoppingSequenceDTO[];
};

export default function SequencesLiveTable({ initialSequences }: Props) {
  const [rows, setRows] = useState<ShoppingSequenceDTO[]>(initialSequences);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(publicApiUrl("/api/admin/sequences"), {
        credentials: "include",
        cache: "no-store",
      });
      if (!mounted.current) return;
      if (!res.ok) {
        setFetchError(res.status === 403 ? "No permission" : `Error ${res.status}`);
        return;
      }
      const data = (await res.json()) as { sequences?: ShoppingSequenceDTO[] };
      setFetchError(null);
      setRows(data.sequences ?? []);
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
          {fetchError ? (
            <span className="ml-2 text-red-600">· {fetchError}</span>
          ) : null}
        </span>
        <span className="tabular-nums">
          Last refresh: {new Date(updatedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-3 bg-white">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="border-b border-gray-3 bg-gray-1 text-xs uppercase text-dark-4">
            <tr>
              <th className="px-3 py-3 font-medium">Started</th>
              <th className="px-3 py-3 font-medium">Trigger</th>
              <th className="px-3 py-3 font-medium">Label</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">User</th>
              <th className="px-3 py-3 font-medium">Product visit</th>
              <th className="px-3 py-3 font-medium">Ended</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-dark-4">
                  No sequences recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-3 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 text-dark">{fmt(r.startedAt)}</td>
                  <td className="px-3 py-2.5 text-dark">{r.triggerType}</td>
                  <td className="max-w-[240px] truncate px-3 py-2.5 text-dark" title={r.triggerLabel}>
                    {r.triggerLabel}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-dark">{r.status}</td>
                  <td
                    className="max-w-[200px] truncate px-3 py-2.5 text-dark-4"
                    title={r.userId ? `ID: ${r.userId}` : ""}
                  >
                    {r.userDisplayName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-dark-4">{fmt(r.productVisitedAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-dark-4">{fmt(r.endedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
