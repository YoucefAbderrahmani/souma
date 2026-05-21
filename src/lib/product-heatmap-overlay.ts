import type { ConceptionHeatmapDetailDto, ConceptionHeatmapMetric } from "@/types/conception-heatmap";
import { PRODUCT_HEATMAP_SURFACE_ATTR } from "@/lib/product-heatmap-surface";

export const PRODUCT_HEATMAP_OVERLAY_ATTR = "data-product-heatmap-overlay";
const PARENT_OVERLAY_LAYER_ATTR = "data-product-heatmap-overlay-layer";

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
  doc
    .querySelector(`canvas[${PRODUCT_HEATMAP_OVERLAY_ATTR}]`)
    ?.remove();
}

/** Legacy in-iframe overlay (preview uses parent overlay for correct alignment). */
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

/**
 * Draws the heatmap on the admin preview container, aligned to the iframe surface using
 * getBoundingClientRect (fixes offset when the preview is CSS-scaled to fit the panel).
 */
export function syncParentDocumentHeatmapOverlay(
  container: HTMLElement,
  iframe: HTMLIFrameElement,
  heatmap: ConceptionHeatmapDetailDto | null
): () => void {
  let layer = container.querySelector(
    `[${PARENT_OVERLAY_LAYER_ATTR}]`
  ) as HTMLDivElement | null;
  let canvas = layer?.querySelector(
    `canvas[${PRODUCT_HEATMAP_OVERLAY_ATTR}]`
  ) as HTMLCanvasElement | null;
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
    layer.setAttribute(PARENT_OVERLAY_LAYER_ATTR, "");
    layer.setAttribute("aria-hidden", "true");
    layer.style.position = "absolute";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "30";
    layer.style.overflow = "hidden";
    container.appendChild(layer);

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
    if (!doc) {
      layer.style.display = "none";
      return;
    }

    removeIframeHeatmapCanvas(doc);

    const surface = doc.querySelector(
      `[${PRODUCT_HEATMAP_SURFACE_ATTR}]`
    ) as HTMLElement | null;
    if (!surface) {
      layer.style.display = "none";
      return;
    }

    const surfaceRect = surface.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (surfaceRect.width <= 0 || surfaceRect.height <= 0) {
      layer.style.display = "none";
      return;
    }

    layer.style.display = "block";
    layer.style.left = `${surfaceRect.left - containerRect.left}px`;
    layer.style.top = `${surfaceRect.top - containerRect.top}px`;
    layer.style.width = `${surfaceRect.width}px`;
    layer.style.height = `${surfaceRect.height}px`;

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

  const containerObserver = new ResizeObserver(scheduleSync);
  containerObserver.observe(container);

  const doc = iframe.contentDocument;
  const surface = doc?.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null;
  const surfaceObserver = surface ? new ResizeObserver(scheduleSync) : null;
  surfaceObserver?.observe(surface);

  const win = doc?.defaultView;
  const onScroll = () => scheduleSync();
  win?.addEventListener("scroll", onScroll, { passive: true });
  win?.addEventListener("resize", onScroll, { passive: true });

  return () => {
    containerObserver.disconnect();
    surfaceObserver?.disconnect();
    win?.removeEventListener("scroll", onScroll);
    win?.removeEventListener("resize", onScroll);
    teardown();
  };
}
