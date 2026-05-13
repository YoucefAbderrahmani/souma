import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { getCatalogProductAliasIds, getCatalogProducts } from "@/server/data-access/product-catalog";
import { PA_JS_ERROR, STORE_EVENT } from "@/server/conception/event-contract";
import { listAppliedActionsInRange } from "@/server/seller-helper/applied-actions";
import {
  TIMELINE_METRIC_DEFINITIONS,
  TIMELINE_METRIC_IDS,
  TIMELINE_RANGE_DEFINITIONS,
  type TimelineDto,
  type TimelineGranularity,
  type TimelineMetricId,
  type TimelineRangeId,
  type TimelineScope,
  type TimelineSeriesDto,
} from "@/types/seller-helper-timeline";

const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

type BucketKey = string;

type EventCountRow = {
  bucket: Date | string;
  views: number;
  unique_sessions: number;
  add_to_carts: number;
  purchases: number;
};

function bucketsForRange(range: TimelineRangeId, now: Date) {
  const def = TIMELINE_RANGE_DEFINITIONS[range];
  const granularity: TimelineGranularity = def.granularity;
  const count = def.bucketCount;
  const buckets: Date[] = [];
  const aligned = new Date(now);
  if (granularity === "hour") {
    aligned.setUTCMinutes(0, 0, 0);
  } else {
    aligned.setUTCHours(0, 0, 0, 0);
  }
  const stepMs = granularity === "hour" ? MS_HOUR : MS_DAY;
  for (let i = count - 1; i >= 0; i -= 1) {
    buckets.push(new Date(aligned.getTime() - i * stepMs));
  }
  const start = buckets[0];
  const end = new Date(aligned.getTime() + stepMs);
  return { granularity, count, buckets, start, end, stepMs };
}

function bucketKeyFor(date: Date, granularity: TimelineGranularity): BucketKey {
  const d = new Date(date);
  if (granularity === "hour") {
    d.setUTCMinutes(0, 0, 0);
  } else {
    d.setUTCHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

async function loadEventCounts(
  start: Date,
  end: Date,
  granularity: TimelineGranularity,
  productAliasIds: number[] | null
): Promise<Map<BucketKey, EventCountRow>> {
  const truncUnit = granularity === "hour" ? "hour" : "day";
  const productFilter =
    productAliasIds && productAliasIds.length > 0 ?
      sql` AND product_local_id IN (${sql.join(
        productAliasIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      date_trunc(${truncUnit}, created_at) AS bucket,
      COUNT(*) FILTER (WHERE event_name = ${STORE_EVENT.productView})::int   AS views,
      COUNT(DISTINCT session_key)::int                                       AS unique_sessions,
      COUNT(*) FILTER (WHERE event_name = ${STORE_EVENT.addToCart})::int     AS add_to_carts,
      COUNT(*) FILTER (WHERE event_name = ${STORE_EVENT.purchase})::int      AS purchases
    FROM sales_micro_event
    WHERE created_at >= ${start}
      AND created_at <  ${end}
      ${productFilter}
    GROUP BY 1
    ORDER BY 1
  `);

  const map = new Map<BucketKey, EventCountRow>();
  for (const raw of result.rows as Array<Record<string, unknown>>) {
    const bucketRaw = raw.bucket;
    const bucket =
      bucketRaw instanceof Date ?
        bucketRaw
      : new Date(typeof bucketRaw === "string" ? bucketRaw : String(bucketRaw ?? ""));
    if (Number.isNaN(bucket.getTime())) continue;
    const key = bucketKeyFor(bucket, granularity);
    map.set(key, {
      bucket,
      views: Number(raw.views ?? 0),
      unique_sessions: Number(raw.unique_sessions ?? 0),
      add_to_carts: Number(raw.add_to_carts ?? 0),
      purchases: Number(raw.purchases ?? 0),
    });
  }
  // Reference PA_JS_ERROR so import is preserved if removed later.
  void PA_JS_ERROR;
  return map;
}

function rateValue(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function metricValueFor(metric: TimelineMetricId, row: EventCountRow | undefined): number {
  if (!row) return 0;
  switch (metric) {
    case "views":
      return row.views;
    case "uniqueSessions":
      return row.unique_sessions;
    case "addToCarts":
      return row.add_to_carts;
    case "purchases":
      return row.purchases;
    case "conversionRate":
      return rateValue(row.purchases, row.views);
    default:
      return 0;
  }
}

function aggregateTotal(metric: TimelineMetricId, rows: EventCountRow[]): number {
  if (rows.length === 0) return 0;
  if (metric === "conversionRate") {
    const views = rows.reduce((sum, row) => sum + row.views, 0);
    const purchases = rows.reduce((sum, row) => sum + row.purchases, 0);
    return rateValue(purchases, views);
  }
  return rows.reduce((sum, row) => sum + metricValueFor(metric, row), 0);
}

function buildSeries(
  metric: TimelineMetricId,
  bucketKeys: BucketKey[],
  counts: Map<BucketKey, EventCountRow>
): TimelineSeriesDto {
  const def = TIMELINE_METRIC_DEFINITIONS[metric];
  const values: number[] = bucketKeys.map((key) => metricValueFor(metric, counts.get(key)));
  const filledRows: EventCountRow[] = bucketKeys.map(
    (key) =>
      counts.get(key) ?? {
        bucket: new Date(key),
        views: 0,
        unique_sessions: 0,
        add_to_carts: 0,
        purchases: 0,
      }
  );

  const total = aggregateTotal(metric, filledRows);
  let peak = 0;
  let peakBucketIndex = -1;
  values.forEach((value, index) => {
    if (value > peak) {
      peak = value;
      peakBucketIndex = index;
    }
  });
  const denom = values.length > 0 ? values.length : 1;
  const average =
    def.unit === "percent" ?
      total // total already represents the windowed rate when unit is percent
    : total / denom;

  return {
    metric,
    label: def.label,
    shortLabel: def.shortLabel,
    unit: def.unit,
    color: def.color,
    values,
    total,
    average,
    peak,
    peakBucketIndex,
  };
}

export type BuildTimelineSeriesOptions = {
  range: TimelineRangeId;
  scope: TimelineScope;
  productId: number | null;
  metrics: TimelineMetricId[];
};

export async function buildTimelineSeries(
  options: BuildTimelineSeriesOptions
): Promise<TimelineDto> {
  const range = TIMELINE_RANGE_DEFINITIONS[options.range] ? options.range : "24h";
  const requestedMetrics =
    options.metrics.length > 0 ?
      options.metrics.filter((metric): metric is TimelineMetricId =>
        TIMELINE_METRIC_IDS.includes(metric)
      )
    : (["views", "addToCarts", "purchases"] as TimelineMetricId[]);
  const uniqueMetrics: TimelineMetricId[] = Array.from(new Set(requestedMetrics));
  if (uniqueMetrics.length === 0) {
    uniqueMetrics.push("views");
  }

  const now = new Date();
  const { granularity, buckets, start, end } = bucketsForRange(range, now);
  const bucketKeys = buckets.map((bucket) => bucketKeyFor(bucket, granularity));

  let productId: number | null = null;
  let productTitle: string | null = null;
  let aliasIds: number[] | null = null;
  if (options.scope === "product" && options.productId && options.productId > 0) {
    productId = Math.trunc(options.productId);
    aliasIds = await getCatalogProductAliasIds(productId);
    if (aliasIds.length === 0) {
      aliasIds = [productId];
    }
    const products = await getCatalogProducts();
    const product = products.find((item) => item.id === productId);
    productTitle = product?.title ?? null;
  }

  const [counts, appliedActions] = await Promise.all([
    loadEventCounts(start, end, granularity, aliasIds),
    listAppliedActionsInRange({
      start,
      end,
      productId: options.scope === "product" ? productId : null,
      includeStoreWide: true,
    }),
  ]);
  const series = uniqueMetrics.map((metric) => buildSeries(metric, bucketKeys, counts));
  const hasData = series.some((entry) => entry.values.some((value) => value > 0));

  return {
    range,
    scope: options.scope,
    granularity,
    productId,
    productTitle,
    computedAt: now.toISOString(),
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    bucketCount: bucketKeys.length,
    buckets: bucketKeys,
    series,
    hasData,
    appliedActions,
  };
}
