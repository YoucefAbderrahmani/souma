import { heatmapPctToPixel } from "@/lib/product-heatmap-surface";
import type { ConceptionHeatmapCell, ConceptionHeatmapDetailDto, ConceptionHeatmapMetric } from "@/types/conception-heatmap";

function cellPointerPct(
  cell: ConceptionHeatmapCell,
  heatmap: ConceptionHeatmapDetailDto,
  ox = 0.5,
  oy = 0.5
) {
  const cellW = 100 / heatmap.gridWidth;
  const cellH = 100 / heatmap.gridHeight;
  if (Number.isFinite(cell.xPct) && Number.isFinite(cell.yPct) && ox === 0.5 && oy === 0.5) {
    return { xPct: cell.xPct, yPct: cell.yPct };
  }
  return {
    xPct: (cell.x + ox) * cellW,
    yPct: (cell.y + oy) * cellH,
  };
}

/**
 * heatmap.js palettes — classic analytics look (blue → cyan → green → yellow → red).
 * Cold stays fully transparent so the product page stays visible.
 */
const METRIC_GRADIENTS: Record<ConceptionHeatmapMetric, Record<string, string>> = {
  hover: {
    "0": "rgba(0,0,0,0)",
    "0.12": "rgba(0,0,255,0.35)",
    "0.28": "rgba(0,200,255,0.5)",
    "0.45": "rgba(0,255,128,0.62)",
    "0.62": "rgba(255,255,0,0.74)",
    "0.78": "rgba(255,140,0,0.84)",
    "0.92": "rgba(255,40,0,0.92)",
    "1": "rgba(200,0,0,0.96)",
  },
  click: {
    "0": "rgba(0,0,0,0)",
    "0.15": "rgba(255,240,150,0.32)",
    "0.35": "rgba(255,200,0,0.52)",
    "0.55": "rgba(255,120,0,0.68)",
    "0.75": "rgba(255,50,0,0.82)",
    "0.9": "rgba(220,0,0,0.92)",
    "1": "rgba(160,0,0,0.96)",
  },
  view: {
    "0": "rgba(0,0,0,0)",
    "0.15": "rgba(180,255,220,0.3)",
    "0.35": "rgba(80,230,160,0.5)",
    "0.55": "rgba(0,200,120,0.66)",
    "0.75": "rgba(0,150,90,0.8)",
    "0.9": "rgba(0,110,70,0.9)",
    "1": "rgba(0,80,50,0.96)",
  },
};

export const HEATMAP_LEGEND_GRADIENT: Record<ConceptionHeatmapMetric, string> = {
  hover:
    "linear-gradient(90deg, transparent 0%, #0000ff 12%, #00c8ff 28%, #00ff80 45%, #ffff00 62%, #ff8c00 78%, #ff2800 92%, #c80000 100%)",
  click:
    "linear-gradient(90deg, transparent 0%, #fff096 15%, #ffc800 35%, #ff7800 55%, #ff3200 75%, #dc0000 100%)",
  view:
    "linear-gradient(90deg, transparent 0%, #b4ffdc 15%, #50e6a0 35%, #00c878 55%, #00965a 75%, #005032 100%)",
};

function computeDisplayCap(counts: number[]) {
  if (counts.length === 0) return 1;
  const sorted = [...counts].sort((left, right) => left - right);
  const capIndex = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.88));
  return Math.max(1, sorted[capIndex] ?? sorted[sorted.length - 1] ?? 1);
}

function cellRenderStrength(count: number, displayCap: number) {
  const ratio = Math.min(1, count / displayCap);
  return Math.pow(ratio, 0.68);
}

/** 4×4 samples per grid cell → smooth heatmap.js blending. */
const CELL_SAMPLE_OFFSETS: Array<[number, number, number]> = (() => {
  const samples: Array<[number, number, number]> = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const ox = (col + 0.5) / 4;
      const oy = (row + 0.5) / 4;
      const center = (col === 1 || col === 2) && (row === 1 || row === 2);
      samples.push([ox, oy, center ? 1 : 0.72]);
    }
  }
  return samples;
})();

export function heatmapRadiusForSize(
  width: number,
  height: number,
  gridWidth = 48,
  gridHeight = 72
) {
  const cellW = width / Math.max(1, gridWidth);
  const cellH = height / Math.max(1, gridHeight);
  const fromGrid = Math.min(cellW, cellH) * 1.85;
  const fromViewport = Math.min(width, height) * 0.072;
  return Math.round(Math.max(38, Math.min(105, Math.max(fromGrid, fromViewport))));
}

export function cellsToHeatmapPoints(
  heatmap: ConceptionHeatmapDetailDto,
  width: number,
  height: number
): { points: Array<{ x: number; y: number; value: number }>; max: number } {
  const displayCap = computeDisplayCap(heatmap.cells.map((cell) => cell.count));
  const points: Array<{ x: number; y: number; value: number }> = [];
  let max = 0.001;

  for (const cell of heatmap.cells) {
    const strength = cellRenderStrength(cell.count, displayCap);
    if (strength < 0.03) continue;

    for (const [ox, oy, weight] of CELL_SAMPLE_OFFSETS) {
      const { xPct, yPct } = cellPointerPct(cell, heatmap, ox, oy);
      const { x, y } = heatmapPctToPixel(xPct, yPct, width, height);
      const value = Math.max(0.04, strength * weight);
      max = Math.max(max, value);
      points.push({ x, y, value });
    }
  }

  return { points, max };
}

export type GaussianHeatmapRenderer = {
  repaint: (heatmap: ConceptionHeatmapDetailDto, width: number, height: number) => void;
  destroy: () => void;
};

const RENDERER_DEFAULTS = {
  maxOpacity: 0.72,
  minOpacity: 0.03,
  blur: 0.93,
} as const;

export async function createGaussianHeatmapRenderer(
  container: HTMLElement
): Promise<GaussianHeatmapRenderer> {
  const h337 = (await import("heatmap.js")).default;
  let instance = h337.create({
    container,
    radius: 52,
    ...RENDERER_DEFAULTS,
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

      const radius = heatmapRadiusForSize(
        paintWidth,
        paintHeight,
        heatmap.gridWidth,
        heatmap.gridHeight
      );
      const blur = heatmap.metric === "click" ? 0.9 : RENDERER_DEFAULTS.blur;

      instance.configure({
        radius,
        blur,
        maxOpacity: RENDERER_DEFAULTS.maxOpacity,
        minOpacity: RENDERER_DEFAULTS.minOpacity,
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
        radius: 52,
        ...RENDERER_DEFAULTS,
        gradient: METRIC_GRADIENTS.hover,
        backgroundColor: "rgba(0,0,0,0)",
      });
    },
  };
}
