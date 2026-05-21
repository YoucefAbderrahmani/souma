import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { conceptionAlertSettingsTable } from "@/server/db/schema";
import { DEFAULT_ALERT_RULE_SETTINGS } from "@/lib/conception-alert-rule-defaults";
import type {
  ConceptionAlertRule,
  ConceptionAlertRuleKey,
  ConceptionAlertRuleSettings,
} from "@/types/conception-admin";

export { DEFAULT_ALERT_RULE_SETTINGS };

const RULE_LABELS: Record<ConceptionAlertRuleKey, string> = {
  CONVERSION_DROP: "Conversion drop",
  TRAFFIC_SPIKE: "Abnormal traffic",
  CART_ABANDON_MASS: "Cart abandonment",
  JS_ERROR_BURST: "JavaScript errors",
  PERF_SLOW: "Performance",
};

const SETTINGS_ID = "default";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function mergeSettings(partial: Partial<ConceptionAlertRuleSettings>): ConceptionAlertRuleSettings {
  const d = DEFAULT_ALERT_RULE_SETTINGS;
  return normalizeSettings({
    CONVERSION_DROP: { ...d.CONVERSION_DROP, ...partial.CONVERSION_DROP },
    TRAFFIC_SPIKE: { ...d.TRAFFIC_SPIKE, ...partial.TRAFFIC_SPIKE },
    CART_ABANDON_MASS: { ...d.CART_ABANDON_MASS, ...partial.CART_ABANDON_MASS },
    JS_ERROR_BURST: { ...d.JS_ERROR_BURST, ...partial.JS_ERROR_BURST },
    PERF_SLOW: { ...d.PERF_SLOW, ...partial.PERF_SLOW },
  });
}

export function normalizeSettings(raw: ConceptionAlertRuleSettings): ConceptionAlertRuleSettings {
  return {
    CONVERSION_DROP: {
      enabled: Boolean(raw.CONVERSION_DROP.enabled),
      dropRatioThreshold: clamp(Number(raw.CONVERSION_DROP.dropRatioThreshold) || 0.8, 0.1, 1),
      minReferenceRate: clamp(Number(raw.CONVERSION_DROP.minReferenceRate) || 0.001, 0, 0.5),
    },
    TRAFFIC_SPIKE: {
      enabled: Boolean(raw.TRAFFIC_SPIKE.enabled),
      spikeMultiplier: clamp(Number(raw.TRAFFIC_SPIKE.spikeMultiplier) || 4, 1.5, 20),
    },
    CART_ABANDON_MASS: {
      enabled: Boolean(raw.CART_ABANDON_MASS.enabled),
      minCartSessions: Math.round(clamp(Number(raw.CART_ABANDON_MASS.minCartSessions) || 8, 1, 500)),
      abandonRateThreshold: clamp(Number(raw.CART_ABANDON_MASS.abandonRateThreshold) || 0.8, 0.1, 1),
    },
    JS_ERROR_BURST: {
      enabled: Boolean(raw.JS_ERROR_BURST.enabled),
      errorRateThreshold: clamp(Number(raw.JS_ERROR_BURST.errorRateThreshold) || 0.05, 0.01, 1),
    },
    PERF_SLOW: {
      enabled: Boolean(raw.PERF_SLOW.enabled),
      minSlowSessions: Math.round(clamp(Number(raw.PERF_SLOW.minSlowSessions) || 5, 1, 500)),
    },
  };
}

export function formatAlertRuleCondition(
  key: ConceptionAlertRuleKey,
  settings: ConceptionAlertRuleSettings
): string {
  switch (key) {
    case "CONVERSION_DROP": {
      const s = settings.CONVERSION_DROP;
      return `Conversion rate below ${(s.dropRatioThreshold * 100).toFixed(0)}% of the previous window (7 days).`;
    }
    case "TRAFFIC_SPIKE": {
      const s = settings.TRAFFIC_SPIKE;
      return `Event volume ×${s.spikeMultiplier} vs baseline over 15 minutes (90 min reference).`;
    }
    case "CART_ABANDON_MASS": {
      const s = settings.CART_ABANDON_MASS;
      return `Cart abandonment rate above ${(s.abandonRateThreshold * 100).toFixed(0)}% with at least ${s.minCartSessions} cart sessions (2 h).`;
    }
    case "JS_ERROR_BURST": {
      const s = settings.JS_ERROR_BURST;
      return `pa_js_error on more than ${(s.errorRateThreshold * 100).toFixed(0)}% of checkout sessions (2 h).`;
    }
    case "PERF_SLOW": {
      const s = settings.PERF_SLOW;
      return `Slow navigation or elevated LCP on at least ${s.minSlowSessions} sessions (2 h).`;
    }
    default:
      return "";
  }
}

export function settingsToAlertRules(settings: ConceptionAlertRuleSettings): ConceptionAlertRule[] {
  return (Object.keys(RULE_LABELS) as ConceptionAlertRuleKey[]).map((key) => ({
    key,
    name: RULE_LABELS[key],
    condition: formatAlertRuleCondition(key, settings),
    enabled: settings[key].enabled,
  }));
}

export async function getConceptionAlertRuleSettings(): Promise<ConceptionAlertRuleSettings> {
  try {
    const rows = await db
      .select()
      .from(conceptionAlertSettingsTable)
      .where(eq(conceptionAlertSettingsTable.id, SETTINGS_ID))
      .limit(1);
    const row = rows[0];
    if (!row?.settingsJson) return { ...DEFAULT_ALERT_RULE_SETTINGS };
    const parsed = JSON.parse(row.settingsJson) as Partial<ConceptionAlertRuleSettings>;
    return mergeSettings(parsed);
  } catch {
    return { ...DEFAULT_ALERT_RULE_SETTINGS };
  }
}

export async function saveConceptionAlertRuleSettings(
  partial: Partial<ConceptionAlertRuleSettings>
): Promise<{ ok: true; settings: ConceptionAlertRuleSettings; rules: ConceptionAlertRule[]; updatedAt: string } | { ok: false; error: string }> {
  const current = await getConceptionAlertRuleSettings();
  const settings = mergeSettings({ ...current, ...partial });
  const json = JSON.stringify(settings);

  try {
    await db
      .insert(conceptionAlertSettingsTable)
      .values({ id: SETTINGS_ID, settingsJson: json, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: conceptionAlertSettingsTable.id,
        set: { settingsJson: json, updatedAt: new Date() },
      });
  } catch (e) {
    console.error("[alert-rule-settings] save", e);
    return { ok: false, error: "Failed to save alert rules." };
  }

  const updatedAt = new Date().toISOString();
  return {
    ok: true,
    settings,
    rules: settingsToAlertRules(settings),
    updatedAt,
  };
}
