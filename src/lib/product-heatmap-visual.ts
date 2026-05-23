import { heatmapPctToPixel } from "@/lib/product-heatmap-surface";
import type { ConceptionHeatmapCell, ConceptionHeatmapDetailDto, ConceptionHeatmapMetric } from "@/types/conception-heatmap";

function cellPointerPct(cell: ConceptionHeatmapCell, heatmap: ConceptionHeatmapDetailDto, ox = 0.5, oy = 0.5) {
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

/** heatmap.js gradients — classic high-contrast analytics presets. */
const METRIC_GRADIENTS: Record<ConceptionHeatmapMetric, Record<string, string>> = {
  hover: {
    "0": "rgba(0,0,0,0)",
    "0.18": "rgba(0,0,255,0.28)",
    "0.38": "rgba(0,128,255,0.48)",
    "0.58": "rgba(0,255,255,0.62)",
    "0.75": "rgba(0,255,128,0.75)",
    "0.9": "rgba(255,255,0,0.88)",
    "1": "rgba(255,0,0,0.96)",
  },
  click: {
    "0": "rgba(0,0,0,0)",
    "0.15": "rgba(255,255,178,0.25)",
    "0.35": "rgba(255,204,0,0.48)",
    "0.55": "rgba(255,128,0,0.68)",
    "0.75": "rgba(255,64,0,0.82)",
    "0.9": "rgba(255,0,0,0.92)",
    "1": "rgba(204,0,0,0.98)",
  },
  view: {
    "0": "rgba(0,0,0,0)",
    "0.2": "rgba(0,255,200,0.28)",
    "0.42": "rgba(0,220,140,0.5)",
    "0.62": "rgba(0,180,100,0.68)",
    "0.8": "rgba(0,140,80,0.84)",
    "0.92": "rgba(0,100,60,0.94)",
    "1": "rgba(0,70,45,0.98)",
  },
};

export function heatmapRadiusForSize(width: number, height: number, gridWidth = 48, gridHeight = 72) {
  const base = Math.min(width, height);
  const fromViewport = Math.round(Math.max(32, Math.min(110, base * 0.078)));
  const cellW = width / Math.max(1, gridWidth);
  const cellH = height / Math.max(1, gridHeight);
  const fromGrid = Math.round(Math.min(cellW, cellH) * 1.45);
  return Math.max(fromViewport, fromGrid);
}

/** Legend gradients aligned with heatmap.js output. */
export const HEATMAP_LEGEND_GRADIENT: Record<ConceptionHeatmapMetric, string> = {
  hover:
    "linear-gradient(90deg, transparent 0%, #0000ff 18%, #0080ff 38%, #00ffff 58%, #00ff80 75%, #ffff00 90%, #ff0000 100%)",
  click:
    "linear-gradient(90deg, transparent 0%, #ffffb2 15%, #ffcc00 35%, #ff8000 55%, #ff4000 75%, #ff0000 100%)",
  view:
    "linear-gradient(90deg, transparent 0%, #00ffc8 20%, #00dc8c 42%, #00b464 62%, #008c50 80%, #00462d 100%)",
};

/** Caps hot values so one peak does not flatten the map (not mean-based). */
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

/** Subsample each grid cell so heatmap.js blends smoothly (library-native look). */
const CELL_SAMPLE_OFFSETS: Array<[number, number, number]> = [
  [0.5, 0.5, 1],
  [0.28, 0.28, 0.62],
  [0.72, 0.28, 0.62],
  [0.28, 0.72, 0.62],
  [0.72, 0.72, 0.62],
  [0.5, 0.22, 0.48],
  [0.5, 0.78, 0.48],
  [0.22, 0.5, 0.48],
  [0.78, 0.5, 0.48],
];

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

export async function createGaussianHeatmapRenderer(
  container: HTMLElement
): Promise<GaussianHeatmapRenderer> {
  const h337 = (await import("heatmap.js")).default;
  let instance = h337.create({
    container,
    radius: 48,
    maxOpacity: 0.92,
    minOpacity: 0.04,
    blur: 0.97,
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

      const radius = heatmapRadiusForSize(paintWidth, paintHeight, heatmap.gridWidth, heatmap.gridHeight);
      const blur = heatmap.metric === "click" ? 0.9 : 0.97;
      instance.configure({
        radius,
        blur,
        maxOpacity: 0.92,
        minOpacity: 0.04,
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
        maxOpacity: 0.92,
        minOpacity: 0.04,
        blur: 0.97,
        gradient: METRIC_GRADIENTS.hover,
        backgroundColor: "rgba(0,0,0,0)",
      });
    },
  };
}
