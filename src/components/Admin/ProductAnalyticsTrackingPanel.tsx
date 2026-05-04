"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { publicApiUrl } from "@/lib/public-api-url";
import type { PaEventName } from "@/lib/pa-whitelist";
import {
  PA_CALCULATED_INSIGHTS_NOTE,
  PA_TRACKING_PARAMETER_GROUPS,
} from "@/lib/pa-tracking-parameter-ui";
import { refreshProductAnalyticsTrackingConfig } from "@/lib/product-analytics-client";

type EnabledState = Record<PaEventName, boolean>;

export default function ProductAnalyticsTrackingPanel() {
  const [enabled, setEnabled] = useState<EnabledState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(publicApiUrl("/api/admin/product-analytics/tracking-config"), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setError(j.message || j.error || `HTTP ${res.status}`);
        setEnabled(null);
        return;
      }
      const data = (await res.json()) as { enabled?: EnabledState };
      if (data.enabled && typeof data.enabled === "object") {
        setEnabled(data.enabled);
      } else {
        setError("Invalid response");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disabledList = useMemo(() => {
    if (!enabled) return [];
    return (Object.keys(enabled) as PaEventName[]).filter((k) => enabled[k] === false);
  }, [enabled]);

  const toggle = useCallback((event: PaEventName, next: boolean) => {
    setEnabled((prev) => (prev ? { ...prev, [event]: next } : prev));
  }, []);

  const save = useCallback(async () => {
    if (!enabled) return;
    setSaving(true);
    setError(null);
    setSavedHint(null);
    try {
      const disabled = (Object.keys(enabled) as PaEventName[]).filter((k) => !enabled[k]);
      const res = await fetch(publicApiUrl("/api/admin/product-analytics/tracking-config"), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string; detail?: string };
        setError(j.detail || j.message || j.error || `HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { enabled?: EnabledState };
      if (data.enabled) setEnabled(data.enabled);
      await refreshProductAnalyticsTrackingConfig();
      setSavedHint("Saved. Storefront tabs pick up changes within about 90 seconds, or on reload.");
      window.setTimeout(() => setSavedHint(null), 8000);
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(false);
    }
  }, [enabled]);

  const enableAll = useCallback(() => {
    setEnabled((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      for (const k of Object.keys(next) as PaEventName[]) {
        next[k] = true;
      }
      return next;
    });
  }, []);

  const disableAll = useCallback(() => {
    setEnabled((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      for (const k of Object.keys(next) as PaEventName[]) {
        next[k] = false;
      }
      return next;
    });
  }, []);

  if (loading && !enabled) {
    return (
      <div className="mb-8 rounded-xl border border-gray-3 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm text-dark-4">Loading tracking parameters…</p>
      </div>
    );
  }

  if (error && !enabled) {
    return (
      <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-dark">Product analytics · tracking toggles</h2>
        <p className="mt-2 text-sm text-amber-900">
          {error.includes("product_analytics_tracking_config") || error.includes("does not exist")
            ? "The database table is missing. Apply drizzle/0008_product_analytics_tracking_config.sql on your database, then reload."
            : error}
        </p>
      </div>
    );
  }

  if (!enabled) return null;

  return (
    <div className="mb-8 rounded-xl border border-gray-3 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-dark-4">Admin · Product analytics</p>
          <h2 className="mt-1 text-xl font-semibold text-dark">Parameter tracking</h2>
          <p className="mt-2 max-w-3xl text-sm text-dark-4">
            Turn event families on or off for the whole storefront. Disabled events are dropped in the browser and
            ignored on the server. Run migration <code className="rounded bg-gray-2 px-1">0008_product_analytics_tracking_config.sql</code> if this panel cannot load.
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={enableAll}
            className="rounded-md border border-gray-3 px-3 py-1.5 text-sm font-medium text-dark hover:border-[#FB923C]"
          >
            Enable all
          </button>
          <button
            type="button"
            onClick={disableAll}
            className="rounded-md border border-gray-3 px-3 py-1.5 text-sm font-medium text-dark hover:border-[#FB923C]"
          >
            Disable all
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-md bg-[#FB923C] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#ea580c] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {savedHint ? <p className="mt-3 text-sm text-green-800">{savedHint}</p> : null}

      <p className="mt-4 text-xs text-dark-4">
        Currently off:{" "}
        {disabledList.length === 0 ? (
          <span className="font-medium text-dark">none</span>
        ) : (
          <span className="font-mono text-dark">{disabledList.join(", ")}</span>
        )}
      </p>

      <div className="mt-6 space-y-8">
        {PA_TRACKING_PARAMETER_GROUPS.map((group) => (
          <section key={group.id}>
            <h3 className="text-base font-semibold text-dark">{group.title}</h3>
            {group.description ? <p className="mt-1 text-sm text-dark-4">{group.description}</p> : null}
            <ul className="mt-3 divide-y divide-gray-3 rounded-lg border border-gray-3">
              {group.items.map((row) => {
                const on = enabled[row.event] !== false;
                return (
                  <li
                    key={row.event}
                    className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-dark">{row.label}</p>
                      <p className="font-mono text-xs text-dark-4">{row.event}</p>
                      {row.hint ? <p className="mt-0.5 text-xs text-dark-4">{row.hint}</p> : null}
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 sm:flex-shrink-0">
                      <span className="text-sm text-dark-4">{on ? "On" : "Off"}</span>
                      <span className="relative inline-flex h-7 w-12 items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={on}
                          onChange={(e) => toggle(row.event, e.target.checked)}
                        />
                        <span
                          className={
                            "absolute inset-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#FB923C] peer-focus-visible:ring-offset-2 " +
                            (on ? "bg-[#FB923C]" : "bg-gray-3")
                          }
                        />
                        <span
                          className={
                            "absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform " +
                            (on ? "translate-x-5" : "translate-x-0")
                          }
                        />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section>
          <h3 className="text-base font-semibold text-dark">Calculated insights (read-only)</h3>
          <p className="mt-1 text-sm text-dark-4">
            These metrics are computed from stored events (admin insights / reports), not separate beacons. They update
            when underlying events exist.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {PA_CALCULATED_INSIGHTS_NOTE.map((k) => (
              <li
                key={k}
                className="rounded-md border border-gray-3 bg-gray-1 px-2 py-1 font-mono text-xs text-dark-4"
              >
                {k}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
