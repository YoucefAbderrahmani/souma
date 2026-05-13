export type TimelineMetricId =
  | "views"
  | "uniqueSessions"
  | "addToCarts"
  | "purchases"
  | "conversionRate";

export type TimelineRangeId = "24h" | "7d" | "30d" | "90d";

export type TimelineScope = "store" | "product";

export type TimelineGranularity = "hour" | "day";

export type TimelineMetricUnit = "count" | "percent";

export type TimelineSeriesDto = {
  metric: TimelineMetricId;
  label: string;
  shortLabel: string;
  unit: TimelineMetricUnit;
  color: string;
  values: number[];
  total: number;
  average: number;
  peak: number;
  peakBucketIndex: number;
};

export type TimelineDto = {
  range: TimelineRangeId;
  scope: TimelineScope;
  granularity: TimelineGranularity;
  productId: number | null;
  productTitle: string | null;
  computedAt: string;
  rangeStart: string;
  rangeEnd: string;
  bucketCount: number;
  buckets: string[];
  series: TimelineSeriesDto[];
  hasData: boolean;
  appliedActions: AppliedActionDto[];
};

export type TimelineProductOption = {
  productId: number;
  title: string;
  views: number;
};

export type AppliedActionKind =
  | "vitrina_quick_fix"
  | "security_block"
  | "security_unblock"
  | "alert_resolved"
  | "ai_recommendation";

export type AppliedActionDto = {
  id: string;
  kind: AppliedActionKind;
  kindLabel: string;
  title: string;
  summary: string | null;
  occurredAt: string;
  productId: number | null;
  productTitle: string | null;
  sourceRefId: string | null;
  details: Record<string, unknown>;
};

export const APPLIED_ACTION_KIND_META: Record<
  AppliedActionKind,
  { label: string; color: string; description: string }
> = {
  vitrina_quick_fix: {
    label: "Vitrina quick fix",
    color: "#F27430",
    description: "A catalogue mutation applied from the Vitrina tab (default colour, promo price, etc.).",
  },
  security_block: {
    label: "Session blocked",
    color: "#DC2626",
    description: "A session was added to the security blocklist from the Security tab.",
  },
  security_unblock: {
    label: "Session unblocked",
    color: "#0D9488",
    description: "A previously blocked session was lifted from the blocklist.",
  },
  alert_resolved: {
    label: "Alert resolved",
    color: "#7C3AED",
    description: "An active alert was marked as resolved on the Alerts tab.",
  },
  ai_recommendation: {
    label: "Recommendation applied",
    color: "#2563EB",
    description: "An AI recommendation was dismissed as applied.",
  },
};

export const TIMELINE_METRIC_DEFINITIONS: Record<
  TimelineMetricId,
  {
    id: TimelineMetricId;
    label: string;
    shortLabel: string;
    unit: TimelineMetricUnit;
    color: string;
    description: string;
  }
> = {
  views: {
    id: "views",
    label: "Product views",
    shortLabel: "Views",
    unit: "count",
    color: "#F27430",
    description: "pa_product_view events in each bucket.",
  },
  uniqueSessions: {
    id: "uniqueSessions",
    label: "Unique sessions",
    shortLabel: "Sessions",
    unit: "count",
    color: "#0D9488",
    description: "Distinct session_key values that emitted any pa_* event in the bucket.",
  },
  addToCarts: {
    id: "addToCarts",
    label: "Add to cart",
    shortLabel: "Cart adds",
    unit: "count",
    color: "#F59E0B",
    description: "pa_add_to_cart events in each bucket.",
  },
  purchases: {
    id: "purchases",
    label: "Sales (purchases)",
    shortLabel: "Sales",
    unit: "count",
    color: "#16A34A",
    description: "pa_purchase events in each bucket.",
  },
  conversionRate: {
    id: "conversionRate",
    label: "Conversion rate",
    shortLabel: "Conv. rate",
    unit: "percent",
    color: "#DC2626",
    description: "100 × purchases / views per bucket. 0 when views is 0.",
  },
};

export const TIMELINE_METRIC_IDS: TimelineMetricId[] = Object.keys(
  TIMELINE_METRIC_DEFINITIONS
) as TimelineMetricId[];

export const TIMELINE_RANGE_DEFINITIONS: Record<
  TimelineRangeId,
  {
    id: TimelineRangeId;
    label: string;
    shortLabel: string;
    durationDays: number;
    granularity: TimelineGranularity;
    bucketCount: number;
  }
> = {
  "24h": {
    id: "24h",
    label: "Last 24 hours",
    shortLabel: "24h",
    durationDays: 1,
    granularity: "hour",
    bucketCount: 24,
  },
  "7d": {
    id: "7d",
    label: "Last 7 days",
    shortLabel: "7d",
    durationDays: 7,
    granularity: "day",
    bucketCount: 7,
  },
  "30d": {
    id: "30d",
    label: "Last 30 days",
    shortLabel: "30d",
    durationDays: 30,
    granularity: "day",
    bucketCount: 30,
  },
  "90d": {
    id: "90d",
    label: "Last 90 days",
    shortLabel: "90d",
    durationDays: 90,
    granularity: "day",
    bucketCount: 90,
  },
};

export const TIMELINE_RANGE_IDS: TimelineRangeId[] = Object.keys(
  TIMELINE_RANGE_DEFINITIONS
) as TimelineRangeId[];
