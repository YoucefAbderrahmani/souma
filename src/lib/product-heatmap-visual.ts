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

/** Color stops for heatmap.js (0 = cold/transparent → 1 = hot). */
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
  return Math.round(Math.max(22, Math.min(72, base * 0.055)));
}

export function cellsToHeatmapPoints(
  heatmap: ConceptionHeatmapDetailDto,
  width: number,
  height: number
): { points: Array<{ x: number; y: number; value: number }>; max: number } {
  const points: Array<{ x: number; y: number; value: number }> = [];
  let max = 1;

  for (const cell of heatmap.cells) {
    const value = Math.max(1, cell.count);
    max = Math.max(max, value);

    const { xPct, yPct } = cellPointerPct(cell, heatmap);
    const { x: xi, y: yi } = heatmapPctToPixel(xPct, yPct, width, height);
    points.push({ x: xi, y: yi, value });

    if (cell.intensity >= 25) {
      const w = value * 0.45;
      const spreadPct = Math.min(2.5, (45 / Math.max(width, height)) * 100);
      const offsets = [
        [-spreadPct, -spreadPct],
        [spreadPct, -spreadPct],
        [-spreadPct, spreadPct],
        [spreadPct, spreadPct],
      ] as const;
      for (const [dx, dy] of offsets) {
        const neighbor = heatmapPctToPixel(xPct + dx, yPct + dy, width, height);
        points.push({ x: neighbor.x, y: neighbor.y, value: w });
      }
    }
  }

  return { points, max };
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
    radius: 40,
    maxOpacity: 0.9,
    minOpacity: 0.08,
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
      const blur = heatmap.metric === "click" ? 0.82 : 0.94;
      instance.configure({
        radius,
        blur,
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
        radius: 40,
        maxOpacity: 0.9,
        minOpacity: 0.08,
        blur: 0.94,
        gradient: METRIC_GRADIENTS.hover,
        backgroundColor: "rgba(0,0,0,0)",
      });
    },
  };
}
