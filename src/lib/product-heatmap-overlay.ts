import type { ConceptionHeatmapDetailDto, ConceptionHeatmapMetric } from "@/types/conception-heatmap";
import { PRODUCT_HEATMAP_SURFACE_ATTR } from "@/lib/product-heatmap-surface";

export const PRODUCT_HEATMAP_OVERLAY_ATTR = "data-product-heatmap-overlay";

export type HeatmapStageLayout = {
  surfaceWidth: number;
  surfaceHeight: number;
  surfaceOffsetLeft: number;
  surfaceOffsetTop: number;
};

const STAGE_OVERLAY_LAYER_ATTR = "data-product-heatmap-overlay-layer";

function metricTone(metric: ConceptionHeatmapMetric) {
  if (metric === "hover") return "rgba(59, 130, 246, 0.55)";
  if (metric === "click") return "rgba(239, 68, 68, 0.58)";
  return "rgba(16, 185, 129, 0.5)";
}

function drawHeatmapOnCanvas(canvas: HTMLCanvasElement, heatmap: ConceptionHeatmapDetailDto) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width <= 0 || height <= 0) return;

  const dpr = canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const cellWidth = width / heatmap.gridWidth;
  const cellHeight = height / heatmap.gridHeight;
  const tone = metricTone(heatmap.metric);

  for (const cell of heatmap.cells) {
    const alpha = Math.max(0.12, Math.min(0.9, cell.intensity / 100));
    context.fillStyle = tone.replace(/[\d.]+\)$/, `${alpha})`);
    context.fillRect(cell.x * cellWidth, cell.y * cellHeight, cellWidth, cellHeight);
  }
}

function removeIframeHeatmapCanvas(doc: Document) {
  doc.querySelector(`canvas[${PRODUCT_HEATMAP_OVERLAY_ATTR}]`)?.remove();
}

function readSurfaceOffsetInIframe(iframe: HTMLIFrameElement) {
  const doc = iframe.contentDocument;
  const surface = doc?.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null;
  if (!surface) return null;

  const surfaceRect = surface.getBoundingClientRect();
  const iframeRect = iframe.getBoundingClientRect();
  return {
    left: surfaceRect.left - iframeRect.left,
    top: surfaceRect.top - iframeRect.top,
    width: Math.max(surface.offsetWidth, surfaceRect.width, 1),
    height: Math.max(surface.offsetHeight, surfaceRect.height, 1),
  };
}

/**
 * Overlay lives in the same scaled stage as the iframe so page + heat share one transform.
 */
export function syncStageHeatmapOverlay(
  stage: HTMLElement,
  iframe: HTMLIFrameElement,
  layout: HeatmapStageLayout,
  heatmap: ConceptionHeatmapDetailDto | null
): () => void {
  let layer = stage.querySelector(`[${STAGE_OVERLAY_LAYER_ATTR}]`) as HTMLDivElement | null;
  let canvas = layer?.querySelector(`canvas[${PRODUCT_HEATMAP_OVERLAY_ATTR}]`) as HTMLCanvasElement | null;
  let raf = 0;

  const teardown = () => {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    layer?.remove();
    layer = null;
    canvas = null;
    const doc = iframe.contentDocument;
    if (doc) removeIframeHeatmapCanvas(doc);
  };

  if (!heatmap) {
    teardown();
    return () => {};
  }

  if (!layer) {
    layer = document.createElement("div");
    layer.setAttribute(STAGE_OVERLAY_LAYER_ATTR, "");
    layer.setAttribute("aria-hidden", "true");
    layer.style.position = "absolute";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "20";
    layer.style.overflow = "hidden";
    stage.appendChild(layer);

    canvas = document.createElement("canvas");
    canvas.setAttribute(PRODUCT_HEATMAP_OVERLAY_ATTR, "");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    layer.appendChild(canvas);
  }

  const sync = () => {
    if (!layer || !canvas) return;

    const doc = iframe.contentDocument;
    if (doc) removeIframeHeatmapCanvas(doc);

    const offset = readSurfaceOffsetInIframe(iframe);
    const left = offset?.left ?? 0;
    const top = offset?.top ?? 0;
    const width = offset?.width ?? layout.surfaceWidth;
    const height = offset?.height ?? layout.surfaceHeight;

    if (width <= 0 || height <= 0) {
      layer.style.display = "none";
      return;
    }

    layer.style.display = "block";
    layer.style.left = `${left}px`;
    layer.style.top = `${top}px`;
    layer.style.width = `${width}px`;
    layer.style.height = `${height}px`;

    drawHeatmapOnCanvas(canvas, heatmap);
  };

  const scheduleSync = () => {
    if (raf) window.cancelAnimationFrame(raf);
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      sync();
    });
  };

  scheduleSync();

  const stageObserver = new ResizeObserver(scheduleSync);
  stageObserver.observe(stage);

  const doc = iframe.contentDocument;
  const surface = doc?.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null;
  const surfaceObserver = surface ? new ResizeObserver(scheduleSync) : null;
  surfaceObserver?.observe(surface);

  const win = doc?.defaultView;
  const onScroll = () => scheduleSync();
  win?.addEventListener("scroll", onScroll, { passive: true });
  win?.addEventListener("resize", onScroll, { passive: true });

  return () => {
    stageObserver.disconnect();
    surfaceObserver?.disconnect();
    win?.removeEventListener("scroll", onScroll);
    win?.removeEventListener("resize", onScroll);
    teardown();
  };
}

/** In-iframe overlay (preview uses syncStageHeatmapOverlay). */
export function syncProductHeatmapOverlay(
  doc: Document,
  heatmap: ConceptionHeatmapDetailDto | null
) {
  const surface = doc.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null;
  if (!surface) return () => {};

  const existing = surface.querySelector(
    `canvas[${PRODUCT_HEATMAP_OVERLAY_ATTR}]`
  ) as HTMLCanvasElement | null;

  if (!heatmap) {
    existing?.remove();
    return () => {};
  }

  const canvas =
    existing ??
    (() => {
      const next = doc.createElement("canvas");
      next.setAttribute(PRODUCT_HEATMAP_OVERLAY_ATTR, "");
      next.setAttribute("aria-hidden", "true");
      next.style.position = "absolute";
      next.style.inset = "0";
      next.style.width = "100%";
      next.style.height = "100%";
      next.style.pointerEvents = "none";
      next.style.zIndex = "2147483646";
      const surfaceStyle = doc.defaultView?.getComputedStyle(surface);
      if (surfaceStyle?.position === "static") {
        surface.style.position = "relative";
      }
      surface.appendChild(next);
      return next;
    })();

  const draw = () => drawHeatmapOnCanvas(canvas, heatmap);
  draw();

  const observer = new ResizeObserver(() => draw());
  observer.observe(surface);

  return () => {
    observer.disconnect();
    canvas.remove();
  };
}
