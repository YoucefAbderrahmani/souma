export const PRODUCT_HEATMAP_SURFACE_ATTR = "data-product-heatmap-surface";
export const HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX = 1280;
const PREVIEW_MIN_SURFACE_WIDTH_PX = 700;

function clampPct(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function productHeatmapPointerPct(surface: HTMLElement, event: MouseEvent) {
  const rect = surface.getBoundingClientRect();
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  return {
    x_pct: Number(clampPct((100 * x) / width).toFixed(3)),
    y_pct: Number(clampPct((100 * y) / height).toFixed(3)),
    surface_width: Math.round(width),
    surface_height: Math.round(height),
  };
}

export type ProductHeatmapSurfaceMeasure = {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
  documentWidth: number;
  documentHeight: number;
};

export function resetProductHeatmapPreviewWindow(doc: Document) {
  const view = doc.defaultView;
  if (!view) return;
  view.scrollTo(0, 0);
  doc.documentElement.scrollTop = 0;
  doc.documentElement.scrollLeft = 0;
  if (doc.body) {
    doc.body.scrollTop = 0;
    doc.body.scrollLeft = 0;
  }
}

export function applyProductHeatmapPreviewFrame(
  doc: Document,
  measure: ProductHeatmapSurfaceMeasure
) {
  resetProductHeatmapPreviewWindow(doc);
  doc.defaultView?.scrollTo({
    left: measure.offsetLeft,
    top: measure.offsetTop,
    behavior: "auto",
  });
}

export function measureProductHeatmapSurface(
  doc: Document,
  options?: { viewportWidth?: number }
): ProductHeatmapSurfaceMeasure | null {
  const surface = doc.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null;
  if (!surface) return null;

  const view = doc.defaultView;
  const docEl = doc.documentElement;
  const body = doc.body;
  const scrollX = view?.scrollX ?? docEl.scrollLeft ?? body?.scrollLeft ?? 0;
  const scrollY = view?.scrollY ?? docEl.scrollTop ?? body?.scrollTop ?? 0;
  const rect = surface.getBoundingClientRect();
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  const viewportWidth =
    options?.viewportWidth ??
    Math.max(view?.innerWidth ?? 0, HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX, width, 1);
  const documentHeight = Math.max(
    docEl.scrollHeight,
    body?.scrollHeight ?? 0,
    view?.innerHeight ?? 0,
    Math.round(scrollY + rect.top + height),
    1
  );

  return {
    width,
    height,
    offsetLeft: scrollX + rect.left,
    offsetTop: scrollY + rect.top,
    documentWidth: viewportWidth,
    documentHeight,
  };
}

export function isProductHeatmapPreviewViewportReady(
  doc: Document,
  expectedWidth = HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX
) {
  const innerWidth = doc.defaultView?.innerWidth ?? 0;
  return innerWidth >= expectedWidth - 2;
}

export function measureProductHeatmapPreviewSurface(
  doc: Document
): ProductHeatmapSurfaceMeasure | null {
  if (!isProductHeatmapPreviewViewportReady(doc)) return null;

  const measured = measureProductHeatmapSurface(doc, {
    viewportWidth: HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX,
  });
  if (!measured || measured.width < PREVIEW_MIN_SURFACE_WIDTH_PX) return null;

  return {
    ...measured,
    documentWidth: HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX,
  };
}

export function mergeProductHeatmapPreviewLayout(
  current: ProductHeatmapSurfaceMeasure,
  measured: ProductHeatmapSurfaceMeasure,
  locked: boolean
): { layout: ProductHeatmapSurfaceMeasure; locked: boolean } {
  if (!locked) {
    return { layout: measured, locked: true };
  }

  const width =
    measured.width < current.width * 0.92 && current.width >= PREVIEW_MIN_SURFACE_WIDTH_PX ?
      current.width
    : measured.width;
  const offsetLeft =
    measured.width < current.width * 0.92 && current.width >= PREVIEW_MIN_SURFACE_WIDTH_PX ?
      current.offsetLeft
    : measured.offsetLeft;
  const offsetTop =
    measured.width < current.width * 0.92 && current.width >= PREVIEW_MIN_SURFACE_WIDTH_PX ?
      current.offsetTop
    : measured.offsetTop;

  return {
    layout: {
      width,
      height: Math.max(current.height, measured.height),
      offsetLeft,
      offsetTop,
      documentWidth: HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX,
      documentHeight: Math.max(current.documentHeight, measured.documentHeight),
    },
    locked: true,
  };
}

export function scaleProductHeatmapSurfaceMeasure(
  measure: ProductHeatmapSurfaceMeasure,
  scale: number
) {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return {
    surfaceWidth: measure.width * safeScale,
    surfaceHeight: measure.height * safeScale,
    documentWidth: measure.documentWidth * safeScale,
    documentHeight: measure.documentHeight * safeScale,
    offsetLeft: measure.offsetLeft * safeScale,
    offsetTop: measure.offsetTop * safeScale,
  };
}
