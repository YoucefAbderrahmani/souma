import type { ConceptionAlertRule } from "@/types/conception-admin";

export const CONCEPTION_ALERT_RULES: ConceptionAlertRule[] = [
  {
    name: "Conversion drop",
    condition: "Conversion rate below 80% of the previous window (7 days).",
  },
  {
    name: "Abnormal traffic",
    condition: "Event volume ×4 vs baseline over 15 minutes (90 min reference).",
  },
  {
    name: "Cart abandonment",
    condition: "Cart abandonment rate above 80% over 2 hours.",
  },
  {
    name: "JavaScript errors",
    condition: "pa_js_error on more than 5% of checkout sessions (2 h).",
  },
  {
    name: "Performance",
    condition: "Slow navigation or elevated LCP on multiple sessions (2 h).",
  },
];
