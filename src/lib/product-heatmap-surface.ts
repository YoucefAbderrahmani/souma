export const PRODUCT_HEATMAP_SURFACE_ATTR = "data-product-heatmap-surface";
export const HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX = 1280;
const PREVIEW_MIN_SURFACE_WIDTH_PX = 480;

function clampPct(value: number) {
  return Math.min(100, Math.max(0, value));
}

/** Paint box shared by pointer tracking and heatmap overlay (border-box of the surface). */
export function getProductHeatmapSurfacePaintSize(surface: HTMLElement) {
  const rect = surface.getBoundingClientRect();
  return {
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}

export function productHeatmapPointerPct(surface: HTMLElement, event: MouseEvent) {
  const rect = surface.getBoundingClientRect();
  const { width, height } = getProductHeatmapSurfacePaintSize(surface);
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  return {
    x_pct: Number(clampPct((100 * x) / width).toFixed(3)),
    y_pct: Number(clampPct((100 * y) / height).toFixed(3)),
    surface_width: width,
    surface_height: height,
  };
}

/** Map stored surface percentages to overlay pixel coordinates. */
export function heatmapPctToPixel(
  xPct: number,
  yPct: number,
  paintWidth: number,
  paintHeight: number
) {
  const width = Math.max(1, Math.round(paintWidth));
  const height = Math.max(1, Math.round(paintHeight));
  return {
    x: Math.min(width - 1, Math.max(0, Math.round((xPct / 100) * width))),
    y: Math.min(height - 1, Math.max(0, Math.round((yPct / 100) * height))),
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

/** Align iframe viewport to the product surface (scroll) — legacy. */
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

/** Reset scroll only; parent iframe uses negative offset to crop the surface. */
export function resetProductHeatmapPreviewViewport(doc: Document) {
  resetProductHeatmapPreviewWindow(doc);
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
  const { width, height } = getProductHeatmapSurfacePaintSize(surface);
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

export function isProductHeatmapPreviewViewportReady(doc: Document) {
  const surface = doc.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null;
  if (!surface) return false;

  const innerWidth = doc.defaultView?.innerWidth ?? 0;
  if (innerWidth < 320) return false;

  const width = Math.max(surface.offsetWidth, surface.getBoundingClientRect().width, 0);
  return width >= PREVIEW_MIN_SURFACE_WIDTH_PX - 2;
}

export function measureProductHeatmapPreviewSurface(
  doc: Document
): ProductHeatmapSurfaceMeasure | null {
  resetProductHeatmapPreviewWindow(doc);
  if (!isProductHeatmapPreviewViewportReady(doc)) return null;

  const innerWidth = Math.max(doc.defaultView?.innerWidth ?? 0, HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX);
  const measured = measureProductHeatmapSurface(doc, {
    viewportWidth: innerWidth,
  });
  if (!measured || measured.width < PREVIEW_MIN_SURFACE_WIDTH_PX) return null;

  return {
    ...measured,
    documentWidth: Math.max(measured.documentWidth, innerWidth, HEATMAP_REFERENCE_VIEWPORT_WIDTH_PX),
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
      documentWidth: Math.max(current.documentWidth, measured.documentWidth),
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
