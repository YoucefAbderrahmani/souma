import type { ConceptionAlertRuleSettings } from "@/types/conception-admin";

export const DEFAULT_ALERT_RULE_SETTINGS: ConceptionAlertRuleSettings = {
  CONVERSION_DROP: {
    enabled: true,
    dropRatioThreshold: 0.8,
    minReferenceRate: 0.001,
  },
  TRAFFIC_SPIKE: {
    enabled: true,
    spikeMultiplier: 4,
  },
  CART_ABANDON_MASS: {
    enabled: true,
    minCartSessions: 8,
    abandonRateThreshold: 0.8,
  },
  JS_ERROR_BURST: {
    enabled: true,
    errorRateThreshold: 0.05,
  },
  PERF_SLOW: {
    enabled: true,
    minSlowSessions: 5,
  },
};
