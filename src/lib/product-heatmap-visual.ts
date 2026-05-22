import type { ConceptionHeatmapDetailDto, ConceptionHeatmapMetric } from "@/types/conception-heatmap";

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
  const cellW = width / heatmap.gridWidth;
  const cellH = height / heatmap.gridHeight;
  const points: Array<{ x: number; y: number; value: number }> = [];
  let max = 1;

  for (const cell of heatmap.cells) {
    const value = Math.max(1, cell.count);
    max = Math.max(max, value);

    const cx = (cell.x + 0.5) * cellW;
    const cy = (cell.y + 0.5) * cellH;
    const xi = Math.round(cx);
    const yi = Math.round(cy);

    points.push({ x: xi, y: yi, value });

    if (cell.intensity >= 25) {
      const w = value * 0.45;
      const offsets = [
        [0.32, 0.32],
        [0.68, 0.32],
        [0.32, 0.68],
        [0.68, 0.68],
      ] as const;
      for (const [fx, fy] of offsets) {
        points.push({
          x: Math.min(width - 1, Math.max(0, Math.round(cell.x * cellW + cellW * fx))),
          y: Math.min(height - 1, Math.max(0, Math.round(cell.y * cellH + cellH * fy))),
          value: w,
        });
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

      container.style.width = `${Math.round(width)}px`;
      container.style.height = `${Math.round(height)}px`;

      const radius = heatmapRadiusForSize(width, height);
      instance.configure({
        radius,
        gradient: METRIC_GRADIENTS[heatmap.metric],
      });

      const { points, max } = cellsToHeatmapPoints(heatmap, width, height);
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
