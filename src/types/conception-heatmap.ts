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
  totals: {
    views: number;
    hovers: number;
    clicks: number;
  };
};
