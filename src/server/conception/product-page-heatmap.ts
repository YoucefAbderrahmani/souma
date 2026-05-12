import { and, gte, inArray, sql } from "drizzle-orm";
import { getCatalogProductAliasIds, getCatalogProducts } from "@/server/data-access/product-catalog";
import { db } from "@/server/db";
import { salesMicroEventTable } from "@/server/db/schema";
import type {
  ConceptionHeatmapCell,
  ConceptionHeatmapDetailDto,
  ConceptionHeatmapMetric,
  ConceptionHeatmapPageOption,
} from "@/types/conception-heatmap";

const MS_DAY = 86_400_000;
export const HEATMAP_GRID_WIDTH = 32;
export const HEATMAP_GRID_HEIGHT = 48;
const DEFAULT_WINDOW_DAYS = 7;

type BucketCounts = Map<string, number>;

function bucketKey(x: number, y: number) {
  return `${x}:${y}`;
}

function clampBucket(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max - 1, Math.max(0, Math.floor(value)));
}

function pctToBucket(xPct: number, yPct: number) {
  const x = clampBucket((xPct / 100) * HEATMAP_GRID_WIDTH, HEATMAP_GRID_WIDTH);
  const y = clampBucket((yPct / 100) * HEATMAP_GRID_HEIGHT, HEATMAP_GRID_HEIGHT);
  return { x, y };
}

function addBucket(buckets: BucketCounts, x: number, y: number, weight = 1) {
  const key = bucketKey(x, y);
  buckets.set(key, (buckets.get(key) ?? 0) + weight);
}

function addZone(buckets: BucketCounts, xStart: number, xEnd: number, yStart: number, yEnd: number, weight: number) {
  const x0 = clampBucket(xStart, HEATMAP_GRID_WIDTH);
  const x1 = clampBucket(xEnd, HEATMAP_GRID_WIDTH);
  const y0 = clampBucket(yStart, HEATMAP_GRID_HEIGHT);
  const y1 = clampBucket(yEnd, HEATMAP_GRID_HEIGHT);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      addBucket(buckets, x, y, weight);
    }
  }
}

function parsePayload(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function readPct(payload: Record<string, unknown> | null, key: "x_pct" | "y_pct") {
  const value = payload?.[key];
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function isHeatmapPreviewPointerEvent(payload: Record<string, unknown> | null) {
  if (!payload) return false;
  if (payload.heatmap_embed === true) return true;
  if (payload.heatmap_embed === "true") return true;
  return false;
}

function bucketsToCells(buckets: BucketCounts): ConceptionHeatmapCell[] {
  const max = Math.max(1, ...Array.from(buckets.values()));
  return Array.from(buckets.entries()).map(([key, count]) => {
    const [xRaw, yRaw] = key.split(":");
    const x = Number(xRaw);
    const y = Number(yRaw);
    return {
      x,
      y,
      count,
      intensity: Math.round((100 * count) / max),
    };
  });
}

function readPayloadProductId(payload: Record<string, unknown> | null): number | null {
  const raw = payload?.product_id ?? payload?.productId;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
}

function eventMatchesProduct(
  aliasIds: Set<number>,
  productLocalId: number | null | undefined,
  payload: Record<string, unknown> | null
) {
  if (typeof productLocalId === "number" && aliasIds.has(productLocalId)) return true;
  const payloadId = readPayloadProductId(payload);
  return payloadId != null && aliasIds.has(payloadId);
}

async function aggregateProductSignals(productId: number, since: Date) {
  const aliasIds = new Set(await getCatalogProductAliasIds(productId));
  if (aliasIds.size === 0) {
    return {
      totals: { views: 0, hovers: 0, clicks: 0 },
      hoverBuckets: new Map() as BucketCounts,
      clickBuckets: new Map() as BucketCounts,
      viewBuckets: new Map() as BucketCounts,
    };
  }

  const rows = await db
    .select({
      eventName: salesMicroEventTable.eventName,
      payloadJson: salesMicroEventTable.payloadJson,
      productLocalId: salesMicroEventTable.productLocalId,
    })
    .from(salesMicroEventTable)
    .where(
      and(
        inArray(salesMicroEventTable.productLocalId, Array.from(aliasIds)),
        gte(salesMicroEventTable.createdAt, since)
      )
    );

  const totals = { views: 0, hovers: 0, clicks: 0 };
  const hoverBuckets: BucketCounts = new Map();
  const clickBuckets: BucketCounts = new Map();
  const viewBuckets: BucketCounts = new Map();

  for (const row of rows) {
    const payload = parsePayload(row.payloadJson);
    if (!eventMatchesProduct(aliasIds, row.productLocalId, payload)) continue;
    const eventName = row.eventName;

    if (eventName === "pa_pointer_hover") {
      if (isHeatmapPreviewPointerEvent(payload)) continue;
      totals.hovers += 1;
      const xPct = readPct(payload, "x_pct");
      const yPct = readPct(payload, "y_pct");
      if (xPct != null && yPct != null) {
        const { x, y } = pctToBucket(xPct, yPct);
        addBucket(hoverBuckets, x, y);
      }
      continue;
    }

    if (eventName === "pa_pointer_click") {
      if (isHeatmapPreviewPointerEvent(payload)) continue;
      totals.clicks += 1;
      const xPct = readPct(payload, "x_pct");
      const yPct = readPct(payload, "y_pct");
      if (xPct != null && yPct != null) {
        const { x, y } = pctToBucket(xPct, yPct);
        addBucket(clickBuckets, x, y);
      }
      continue;
    }

    if (eventName === "pa_product_view") {
      totals.views += 1;
      addZone(viewBuckets, 0, HEATMAP_GRID_WIDTH - 1, 0, 5, 1);
      continue;
    }

    if (eventName === "pa_scroll") {
      totals.views += 1;
      const depth = Number(payload?.depth_pct ?? payload?.depth ?? 0);
      if (!Number.isFinite(depth) || depth <= 0) continue;
      const yStart = clampBucket(((depth - 25) / 100) * HEATMAP_GRID_HEIGHT, HEATMAP_GRID_HEIGHT);
      const yEnd = clampBucket((depth / 100) * HEATMAP_GRID_HEIGHT, HEATMAP_GRID_HEIGHT);
      addZone(viewBuckets, 0, HEATMAP_GRID_WIDTH - 1, yStart, yEnd, 1);
      continue;
    }

  }

  return { totals, hoverBuckets, clickBuckets, viewBuckets };
}

export async function listHeatmapProductPages(options?: {
  windowDays?: number;
}): Promise<ConceptionHeatmapPageOption[]> {
  const windowDays = Math.min(30, Math.max(1, options?.windowDays ?? DEFAULT_WINDOW_DAYS));
  const since = new Date(Date.now() - windowDays * MS_DAY);
  const products = await getCatalogProducts();

  const statsRes = await db.execute(sql`
    SELECT
      product_local_id::int AS product_id,
      COUNT(*) FILTER (WHERE event_name = 'pa_product_view')::int AS views,
      COUNT(*) FILTER (
        WHERE event_name = 'pa_pointer_hover'
          AND coalesce(payload_json::jsonb->>'heatmap_embed', 'false') <> 'true'
      )::int AS hovers,
      COUNT(*) FILTER (
        WHERE event_name = 'pa_pointer_click'
          AND coalesce(payload_json::jsonb->>'heatmap_embed', 'false') <> 'true'
      )::int AS clicks
    FROM sales_micro_event
    WHERE created_at >= ${since}
      AND product_local_id IS NOT NULL
    GROUP BY product_local_id
  `);

  const statsById = new Map<number, { views: number; hovers: number; clicks: number }>();
  for (const row of statsRes.rows as { product_id: unknown; views: unknown; hovers: unknown; clicks: unknown }[]) {
    const productId = Number(row.product_id);
    if (!Number.isFinite(productId)) continue;
    statsById.set(productId, {
      views: Number(row.views ?? 0),
      hovers: Number(row.hovers ?? 0),
      clicks: Number(row.clicks ?? 0),
    });
  }

  const pages = await Promise.all(
    products.map(async (product) => {
      const aliasIds = await getCatalogProductAliasIds(product.id);
      const stats = aliasIds.reduce(
        (acc, id) => {
          const row = statsById.get(id);
          if (!row) return acc;
          return {
            views: acc.views + row.views,
            hovers: acc.hovers + row.hovers,
            clicks: acc.clicks + row.clicks,
          };
        },
        { views: 0, hovers: 0, clicks: 0 }
      );
      return {
        productId: product.id,
        title: product.title,
        pagePath: "/shop-details",
        previewImage: product.imgs?.previews?.[0] ?? product.imgs?.thumbnails?.[0] ?? null,
        views: stats.views,
        hovers: stats.hovers,
        clicks: stats.clicks,
      };
    })
  );

  return pages
    .sort((left, right) => {
      const leftScore = left.views + left.hovers + left.clicks;
      const rightScore = right.views + right.hovers + right.clicks;
      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.title.localeCompare(right.title);
    });
}

export async function getProductPageHeatmap(options: {
  productId: number;
  metric: ConceptionHeatmapMetric;
  windowDays?: number;
}): Promise<ConceptionHeatmapDetailDto | null> {
  const productId = Math.trunc(options.productId);
  if (!Number.isFinite(productId) || productId <= 0) return null;

  const windowDays = Math.min(30, Math.max(1, options.windowDays ?? DEFAULT_WINDOW_DAYS));
  const since = new Date(Date.now() - windowDays * MS_DAY);
  const products = await getCatalogProducts();
  const product = products.find((item) => item.id === productId);
  if (!product) return null;

  const { totals, hoverBuckets, clickBuckets, viewBuckets } = await aggregateProductSignals(productId, since);
  const metricBuckets =
    options.metric === "hover" ? hoverBuckets
    : options.metric === "click" ? clickBuckets
    : viewBuckets;

  return {
    productId,
    productTitle: product.title,
    pagePath: "/shop-details",
    previewImage: product.imgs?.previews?.[0] ?? product.imgs?.thumbnails?.[0] ?? null,
    windowDays,
    gridWidth: HEATMAP_GRID_WIDTH,
    gridHeight: HEATMAP_GRID_HEIGHT,
    metric: options.metric,
    cells: bucketsToCells(metricBuckets),
    totals,
  };
}
