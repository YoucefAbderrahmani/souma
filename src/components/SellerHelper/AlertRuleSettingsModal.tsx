"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { readJsonResponse } from "@/lib/admin-api-response";
import type {
  ConceptionAlertRule,
  ConceptionAlertRuleKey,
  ConceptionAlertRuleSettings,
} from "@/types/conception-admin";
import { DEFAULT_ALERT_RULE_SETTINGS } from "@/lib/conception-alert-rule-defaults";
import { sellerGhostButton, sellerPrimaryButton, sellerSecondaryButton } from "./layout";

const RULE_ORDER: ConceptionAlertRuleKey[] = [
  "CONVERSION_DROP",
  "TRAFFIC_SPIKE",
  "CART_ABANDON_MASS",
  "JS_ERROR_BURST",
  "PERF_SLOW",
];

const RULE_TITLES: Record<ConceptionAlertRuleKey, string> = {
  CONVERSION_DROP: "Conversion drop",
  TRAFFIC_SPIKE: "Abnormal traffic",
  CART_ABANDON_MASS: "Cart abandonment",
  JS_ERROR_BURST: "JavaScript errors",
  PERF_SLOW: "Performance",
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (rules: ConceptionAlertRule[]) => void;
};

export default function AlertRuleSettingsModal({ open, onClose, onSaved }: Props) {
  const [settings, setSettings] = useState<ConceptionAlertRuleSettings>(DEFAULT_ALERT_RULE_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/conception/alert-rules", {
        credentials: "include",
        cache: "no-store",
      });
      const body = await readJsonResponse<{
        settings?: ConceptionAlertRuleSettings;
        error?: string;
      }>(res, "Alert rules API");
      if (!res.ok) throw new Error(body.error || "Failed to load settings");
      if (body.settings) setSettings(body.settings);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load alert rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const patchRule = <K extends ConceptionAlertRuleKey>(
    key: K,
    patch: Partial<ConceptionAlertRuleSettings[K]>
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/conception/alert-rules", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const body = await readJsonResponse<{
        rules?: ConceptionAlertRule[];
        error?: string;
      }>(res, "Alert rules API");
      if (!res.ok) throw new Error(body.error || "Save failed");
      toast.success("Alert rules saved.");
      if (body.rules) onSaved?.(body.rules);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setSettings({ ...DEFAULT_ALERT_RULE_SETTINGS });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10080] overflow-y-auto bg-dark/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-rule-settings-title"
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center px-3 pb-8 pt-28 sm:px-6 sm:pt-32 lg:pt-36">
        <div
          className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-3 bg-white shadow-1 max-h-[calc(100dvh-9rem)] sm:max-h-[calc(100dvh-10rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-y-auto p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-dark">
              <Settings2 className="h-4 w-4" aria-hidden />
              Alert engine
            </p>
            <h4 id="alert-rule-settings-title" className="text-lg font-semibold text-dark">
              Trigger rules
            </h4>
          </div>
          <button type="button" onClick={onClose} className={sellerGhostButton} aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {loading ?
          <p className="mt-6 text-custom-sm text-dark-4">Loading rules…</p>
        : <div className="mt-6 space-y-5">
            {RULE_ORDER.map((key) => (
              <fieldset
                key={key}
                className="rounded-lg border border-gray-3 bg-gray-1/50 p-4"
              >
                <legend className="flex w-full items-center justify-between gap-2 px-1">
                  <span className="text-sm font-semibold text-dark">{RULE_TITLES[key]}</span>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-dark-4">
                    <input
                      type="checkbox"
                      checked={settings[key].enabled}
                      onChange={(e) => patchRule(key, { enabled: e.target.checked } as never)}
                      className="h-4 w-4 rounded border-gray-4 text-orange focus:ring-orange"
                    />
                    Enabled
                  </label>
                </legend>

                {key === "CONVERSION_DROP" ?
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs text-dark-4">
                      Drop ratio (current vs reference, 0–1)
                      <input
                        type="number"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={settings.CONVERSION_DROP.dropRatioThreshold}
                        onChange={(e) =>
                          patchRule("CONVERSION_DROP", {
                            dropRatioThreshold: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm text-dark"
                      />
                    </label>
                    <label className="block text-xs text-dark-4">
                      Min. reference conversion rate
                      <input
                        type="number"
                        min={0}
                        max={0.5}
                        step={0.001}
                        value={settings.CONVERSION_DROP.minReferenceRate}
                        onChange={(e) =>
                          patchRule("CONVERSION_DROP", {
                            minReferenceRate: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm text-dark"
                      />
                    </label>
                  </div>
                : null}

                {key === "TRAFFIC_SPIKE" ?
                  <label className="mt-3 block text-xs text-dark-4">
                    Spike multiplier (15m vs 90m baseline)
                    <input
                      type="number"
                      min={1.5}
                      max={20}
                      step={0.5}
                      value={settings.TRAFFIC_SPIKE.spikeMultiplier}
                      onChange={(e) =>
                        patchRule("TRAFFIC_SPIKE", { spikeMultiplier: Number(e.target.value) })
                      }
                      className="mt-1 w-full max-w-xs rounded-lg border border-gray-3 px-3 py-2 text-sm text-dark"
                    />
                  </label>
                : null}

                {key === "CART_ABANDON_MASS" ?
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs text-dark-4">
                      Min. cart sessions (2h)
                      <input
                        type="number"
                        min={1}
                        max={500}
                        step={1}
                        value={settings.CART_ABANDON_MASS.minCartSessions}
                        onChange={(e) =>
                          patchRule("CART_ABANDON_MASS", {
                            minCartSessions: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm text-dark"
                      />
                    </label>
                    <label className="block text-xs text-dark-4">
                      Abandonment rate threshold (0–1)
                      <input
                        type="number"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={settings.CART_ABANDON_MASS.abandonRateThreshold}
                        onChange={(e) =>
                          patchRule("CART_ABANDON_MASS", {
                            abandonRateThreshold: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-3 px-3 py-2 text-sm text-dark"
                      />
                    </label>
                  </div>
                : null}

                {key === "JS_ERROR_BURST" ?
                  <label className="mt-3 block text-xs text-dark-4">
                    Error rate on checkout sessions (0–1)
                    <input
                      type="number"
                      min={0.01}
                      max={1}
                      step={0.01}
                      value={settings.JS_ERROR_BURST.errorRateThreshold}
                      onChange={(e) =>
                        patchRule("JS_ERROR_BURST", { errorRateThreshold: Number(e.target.value) })
                      }
                      className="mt-1 w-full max-w-xs rounded-lg border border-gray-3 px-3 py-2 text-sm text-dark"
                    />
                  </label>
                : null}

                {key === "PERF_SLOW" ?
                  <label className="mt-3 block text-xs text-dark-4">
                    Min. slow sessions (2h)
                    <input
                      type="number"
                      min={1}
                      max={500}
                      step={1}
                      value={settings.PERF_SLOW.minSlowSessions}
                      onChange={(e) =>
                        patchRule("PERF_SLOW", { minSlowSessions: Number(e.target.value) })
                      }
                      className="mt-1 w-full max-w-xs rounded-lg border border-gray-3 px-3 py-2 text-sm text-dark"
                    />
                  </label>
                : null}
              </fieldset>
            ))}
          </div>
        }

          </div>
          <div className="shrink-0 border-t border-gray-3 bg-white px-5 py-4 sm:px-6">
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving || loading} onClick={() => void save()} className={sellerPrimaryButton}>
                {saving ? "Saving…" : "Save rules"}
              </button>
              <button type="button" disabled={saving || loading} onClick={resetDefaults} className={sellerSecondaryButton}>
                Reset to defaults
              </button>
              <button type="button" onClick={onClose} className={sellerGhostButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
