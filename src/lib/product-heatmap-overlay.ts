import type { ConceptionHeatmapDetailDto, ConceptionHeatmapMetric } from "@/types/conception-heatmap";
import { PRODUCT_HEATMAP_SURFACE_ATTR } from "@/lib/product-heatmap-surface";

export const PRODUCT_HEATMAP_OVERLAY_ATTR = "data-product-heatmap-overlay";

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
