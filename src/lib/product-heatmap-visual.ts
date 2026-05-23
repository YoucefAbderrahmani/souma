import { heatmapPctToPixel } from "@/lib/product-heatmap-surface";
import type { ConceptionHeatmapCell, ConceptionHeatmapDetailDto, ConceptionHeatmapMetric } from "@/types/conception-heatmap";

function cellPointerPct(cell: ConceptionHeatmapCell, heatmap: ConceptionHeatmapDetailDto) {
  if (Number.isFinite(cell.xPct) && Number.isFinite(cell.yPct)) {
    return { xPct: cell.xPct, yPct: cell.yPct };
  }
  const cellW = 100 / heatmap.gridWidth;
  const cellH = 100 / heatmap.gridHeight;
  return {
    xPct: (cell.x + 0.5) * cellW,
    yPct: (cell.y + 0.5) * cellH,
  };
}

/** heatmap.js gradients (optional overlay path). */
const METRIC_GRADIENTS: Record<ConceptionHeatmapMetric, Record<string, string>> = {
  hover: {
    "0": "rgba(0,0,0,0)",
    "0.25": "rgba(191,219,254,0.35)",
    "0.45": "rgba(96,165,250,0.55)",
    "0.65": "rgba(59,130,246,0.75)",
    "0.85": "rgba(37,99,235,0.9)",
    "1": "rgba(29,78,216,0.98)",
  },
  click: {
    "0": "rgba(0,0,0,0)",
    "0.2": "rgba(254,215,170,0.4)",
    "0.45": "rgba(251,146,60,0.65)",
    "0.65": "rgba(242,122,26,0.82)",
    "0.85": "rgba(234,88,12,0.92)",
    "1": "rgba(194,65,12,0.98)",
  },
  view: {
    "0": "rgba(0,0,0,0)",
    "0.25": "rgba(167,243,208,0.35)",
    "0.5": "rgba(52,211,153,0.6)",
    "0.7": "rgba(20,184,166,0.78)",
    "0.88": "rgba(13,148,136,0.9)",
    "1": "rgba(15,118,110,0.98)",
  },
};

export function heatmapRadiusForSize(width: number, height: number) {
  const base = Math.min(width, height);
  return Math.round(Math.max(24, Math.min(80, base * 0.06)));
}

export const HEATMAP_LEGEND_GRADIENT: Record<ConceptionHeatmapMetric, string> = {
  hover: "linear-gradient(90deg, #dbeafe 0%, #60a5fa 40%, #2563eb 72%, #1e3a8a 100%)",
  click: "linear-gradient(90deg, #fef3c7 0%, #fb923c 40%, #ea580c 72%, #991b1b 100%)",
  view: "linear-gradient(90deg, #ccfbf1 0%, #2dd4bf 40%, #0d9488 72%, #064e3b 100%)",
};

function computeDisplayCap(counts: number[]) {
  if (counts.length === 0) return 1;
  const sorted = [...counts].sort((left, right) => left - right);
  const capIndex = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.88));
  return Math.max(1, sorted[capIndex] ?? sorted[sorted.length - 1] ?? 1);
}

const METRIC_RGB: Record<ConceptionHeatmapMetric, { r: number; g: number; b: number }> = {
  hover: { r: 37, g: 99, b: 235 },
  click: { r: 234, g: 88, b: 12 },
  view: { r: 13, g: 148, b: 136 },
};

export function cellsToHeatmapPoints(
  heatmap: ConceptionHeatmapDetailDto,
  width: number,
  height: number
): { points: Array<{ x: number; y: number; value: number }>; max: number } {
  const displayCap = computeDisplayCap(heatmap.cells.map((cell) => cell.count));
  const points: Array<{ x: number; y: number; value: number }> = [];
  let max = 0.001;

  for (const cell of heatmap.cells) {
    const ratio = Math.min(1, cell.count / displayCap);
    const value = Math.max(0.05, Math.pow(ratio, 0.72));
    max = Math.max(max, value);

    const { xPct, yPct } = cellPointerPct(cell, heatmap);
    const { x, y } = heatmapPctToPixel(xPct, yPct, width, height);
    points.push({ x, y, value });

    if (cell.intensity >= 25 && value >= 0.35) {
      const w = value * 0.42;
      const spreadPct = Math.min(2.4, (40 / Math.max(width, height)) * 100);
      for (let i = 0; i < 4; i += 1) {
        const angle = (Math.PI / 2) * i;
        const neighbor = heatmapPctToPixel(
          xPct + Math.cos(angle) * spreadPct,
          yPct + Math.sin(angle) * spreadPct,
          width,
          height
        );
        points.push({ x: neighbor.x, y: neighbor.y, value: w });
      }
    }
  }

  return { points, max };
}

/** Synchronous canvas heat — reliable inside preview iframe (no heatmap.js async). */
export function paintHeatmapCanvas2d(
  ctx: CanvasRenderingContext2D,
  heatmap: ConceptionHeatmapDetailDto,
  width: number,
  height: number
) {
  const paintWidth = Math.max(1, Math.round(width));
  const paintHeight = Math.max(1, Math.round(height));
  ctx.clearRect(0, 0, paintWidth, paintHeight);

  const { points, max } = cellsToHeatmapPoints(heatmap, paintWidth, paintHeight);
  if (points.length === 0) return;

  const { r, g, b } = METRIC_RGB[heatmap.metric];
  const radius = heatmapRadiusForSize(paintWidth, paintHeight);

  for (const point of points) {
    const t = Math.min(1, point.value / max);
    const alpha = 0.14 + t * 0.76;
    const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    gradient.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
    gradient.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export type GaussianHeatmapRenderer = {
  repaint: (heatmap: ConceptionHeatmapDetailDto, width: number, height: number) => void;
  destroy: () => void;
};

export async function createGaussianHeatmapRenderer(
  container: HTMLElement
): Promise<GaussianHeatmapRenderer> {
  const h337 = (await import("heatmap.js")).default;
  let instance = h337.create({
    container,
    radius: 48,
    maxOpacity: 0.9,
    minOpacity: 0.06,
    blur: 0.94,
    gradient: METRIC_GRADIENTS.hover,
    backgroundColor: "rgba(0,0,0,0)",
  });

  return {
    repaint(heatmap, width, height) {
      if (width <= 0 || height <= 0) return;

      const paintWidth = Math.round(width);
      const paintHeight = Math.round(height);
      container.style.width = `${paintWidth}px`;
      container.style.height = `${paintHeight}px`;

      const radius = heatmapRadiusForSize(paintWidth, paintHeight);
      instance.configure({
        radius,
        blur: heatmap.metric === "click" ? 0.86 : 0.94,
        gradient: METRIC_GRADIENTS[heatmap.metric],
      });

      const { points, max } = cellsToHeatmapPoints(heatmap, paintWidth, paintHeight);
      if (points.length === 0) {
        instance.setData({ max: 1, min: 0, data: [] });
        instance.repaint();
        return;
      }

      instance.setData({ max, min: 0, data: points });
      instance.repaint();
    },
    destroy() {
      container.innerHTML = "";
      instance = h337.create({
        container,
        radius: 48,
        maxOpacity: 0.9,
        minOpacity: 0.06,
        blur: 0.94,
        gradient: METRIC_GRADIENTS.hover,
        backgroundColor: "rgba(0,0,0,0)",
      });
    },
  };
}
