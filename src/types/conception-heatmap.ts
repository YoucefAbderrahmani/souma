export type ConceptionHeatmapMetric = "view" | "hover" | "click";

export type ConceptionHeatmapPageOption = {
  productId: number;
  title: string;
  pagePath: string;
  previewImage: string | null;
  views: number;
  hovers: number;
  clicks: number;
};

export type ConceptionHeatmapCell = {
  x: number;
  y: number;
  /** Average pointer X on the product surface (0–100%), matches tracking `x_pct`. */
  xPct?: number;
  /** Average pointer Y on the product surface (0–100%), matches tracking `y_pct`. */
  yPct?: number;
  count: number;
  intensity: number;
};

export type ConceptionHeatmapTrafficBaseline = {
  /** Mean event count per occupied grid cell. */
  meanCount: number;
  /** 90th percentile — hot zones scale toward this level. */
  p90Count: number;
  maxCount: number;
  /** Spread around the mean (avoids full-page color when traffic is uniform). */
  stdDevCount: number;
};

export type ConceptionHeatmapDetailDto = {
  productId: number;
  productTitle: string;
  pagePath: string;
  previewImage: string | null;
  windowDays: number;
  gridWidth: number;
  gridHeight: number;
  metric: ConceptionHeatmapMetric;
  cells: ConceptionHeatmapCell[];
  baseline: ConceptionHeatmapTrafficBaseline;
  totals: {
    views: number;
    hovers: number;
    clicks: number;
  };
};
