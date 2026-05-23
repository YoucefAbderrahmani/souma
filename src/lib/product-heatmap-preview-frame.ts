import type { ProductHeatmapSurfaceMeasure } from "@/lib/product-heatmap-surface";

export type HeatmapPreviewFrameGeometry = {
  surfaceWidth: number;
  surfaceHeight: number;
  documentWidth: number;
  documentHeight: number;
  offsetLeft: number;
  offsetTop: number;
};

export function toPreviewFrameGeometry(measure: ProductHeatmapSurfaceMeasure): HeatmapPreviewFrameGeometry {
  return {
    surfaceWidth: measure.width,
    surfaceHeight: measure.height,
    documentWidth: measure.documentWidth,
    documentHeight: measure.documentHeight,
    offsetLeft: measure.offsetLeft,
    offsetTop: measure.offsetTop,
  };
}

export function computeHeatmapPreviewFit(
  containerWidth: number,
  containerHeight: number,
  geometry: HeatmapPreviewFrameGeometry
) {
  const safeW = Math.max(1, geometry.surfaceWidth);
  const safeH = Math.max(1, geometry.surfaceHeight);
  const scale = Math.min(containerWidth / safeW, containerHeight / safeH, 1);
  return {
    scale,
    viewportWidth: Math.max(1, Math.round(safeW * scale)),
    viewportHeight: Math.max(1, Math.round(safeH * scale)),
  };
}
