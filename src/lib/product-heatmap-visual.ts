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
  return Math.round(Math.max(26, Math.min(88, base * 0.065)));
}

type Rgb = [number, number, number];

const METRIC_PALETTES: Record<ConceptionHeatmapMetric, { stops: Array<{ t: number; rgb: Rgb }> }> = {
  hover: {
    stops: [
      { t: 0, rgb: [219, 234, 254] },
      { t: 0.35, rgb: [96, 165, 250] },
      { t: 0.68, rgb: [37, 99, 235] },
      { t: 1, rgb: [30, 64, 175] },
    ],
  },
  click: {
    stops: [
      { t: 0, rgb: [254, 243, 199] },
      { t: 0.35, rgb: [251, 146, 60] },
      { t: 0.68, rgb: [234, 88, 12] },
      { t: 1, rgb: [153, 27, 27] },
    ],
  },
  view: {
    stops: [
      { t: 0, rgb: [204, 251, 241] },
      { t: 0.35, rgb: [45, 212, 191] },
      { t: 0.68, rgb: [13, 148, 136] },
      { t: 1, rgb: [6, 78, 59] },
    ],
  },
};

function samplePalette(metric: ConceptionHeatmapMetric, intensity: number): Rgb {
  const palette = METRIC_PALETTES[metric].stops;
  const t = Math.min(1, Math.max(0, intensity));
  for (let i = 1; i < palette.length; i += 1) {
    const right = palette[i];
    if (t <= right.t) {
      const left = palette[i - 1];
      const span = right.t - left.t || 1;
      const u = (t - left.t) / span;
      return [
        Math.round(left.rgb[0] + (right.rgb[0] - left.rgb[0]) * u),
        Math.round(left.rgb[1] + (right.rgb[1] - left.rgb[1]) * u),
        Math.round(left.rgb[2] + (right.rgb[2] - left.rgb[2]) * u),
      ];
    }
  }
  return palette[palette.length - 1].rgb;
}

/** Caps hot values so one peak or uniform traffic does not flatten the map (not mean-based). */
function computeDisplayCap(counts: number[]) {
  if (counts.length === 0) return 1;
  const sorted = [...counts].sort((left, right) => left - right);
  const capIndex = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.88));
  return Math.max(1, sorted[capIndex] ?? sorted[sorted.length - 1] ?? 1);
}

function cellRenderStrength(count: number, displayCap: number) {
  const ratio = Math.min(1, count / displayCap);
  return Math.pow(ratio, 0.72);
}

type RenderPoint = { x: number; y: number; strength: number };

function buildHeatmapRenderPoints(
  heatmap: ConceptionHeatmapDetailDto,
  width: number,
  height: number
): RenderPoint[] {
  const points: RenderPoint[] = [];
  const displayCap = computeDisplayCap(heatmap.cells.map((cell) => cell.count));

  for (const cell of heatmap.cells) {
    const strength = cellRenderStrength(cell.count, displayCap);
    if (strength < 0.05) continue;

    const { xPct, yPct } = cellPointerPct(cell, heatmap);
    const { x, y } = heatmapPctToPixel(xPct, yPct, width, height);
    points.push({ x, y, strength });

    if (cell.intensity >= 40 && strength >= 0.45) {
      const halo = strength * 0.38;
      const spreadPct = Math.min(2.4, (40 / Math.max(width, height)) * 100);
      for (let i = 0; i < 4; i += 1) {
        const angle = (Math.PI / 2) * i;
        const neighbor = heatmapPctToPixel(
          xPct + Math.cos(angle) * spreadPct,
          yPct + Math.sin(angle) * spreadPct,
          width,
          height
        );
        points.push({ x: neighbor.x, y: neighbor.y, strength: halo });
      }
    }
  }

  return points;
}

function appendDensityBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strength: number
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  const peak = Math.min(1, 0.1 + strength * 0.9);
  gradient.addColorStop(0, `rgba(255,255,255,${peak})`);
  gradient.addColorStop(0.2, `rgba(255,255,255,${peak * 0.7})`);
  gradient.addColorStop(0.5, `rgba(255,255,255,${peak * 0.28})`);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function colorizeDensityField(
  target: CanvasRenderingContext2D,
  density: CanvasRenderingContext2D,
  metric: ConceptionHeatmapMetric,
  width: number,
  height: number
) {
  const image = density.getImageData(0, 0, width, height);
  const out = target.createImageData(width, height);
  const src = image.data;
  const dst = out.data;

  for (let i = 0; i < src.length; i += 4) {
    const intensity = Math.max(src[i], src[i + 1], src[i + 2]) / 255;
    if (intensity < 0.025) continue;

    const curved = Math.pow(intensity, 0.78);
    const [r, g, b] = samplePalette(metric, curved);
    const alpha = Math.min(255, Math.round(35 + curved * 210));
    dst[i] = r;
    dst[i + 1] = g;
    dst[i + 2] = b;
    dst[i + 3] = alpha;
  }

  target.putImageData(out, 0, 0);
}

/** Canvas heat for preview iframe — smooth density + multi-stop palette (no mean filter). */
export function paintHeatmapCanvas2d(
  ctx: CanvasRenderingContext2D,
  heatmap: ConceptionHeatmapDetailDto,
  width: number,
  height: number
) {
  const paintWidth = Math.max(1, Math.round(width));
  const paintHeight = Math.max(1, Math.round(height));
  ctx.clearRect(0, 0, paintWidth, paintHeight);

  const points = buildHeatmapRenderPoints(heatmap, paintWidth, paintHeight);
  if (points.length === 0) return;

  const baseRadius = heatmapRadiusForSize(paintWidth, paintHeight);
  const densityCanvas = document.createElement("canvas");
  densityCanvas.width = paintWidth;
  densityCanvas.height = paintHeight;
  const densityCtx = densityCanvas.getContext("2d");
  if (!densityCtx) return;

  densityCtx.clearRect(0, 0, paintWidth, paintHeight);
  densityCtx.globalCompositeOperation = "lighter";

  for (const point of points) {
    const radius = baseRadius * (0.8 + point.strength * 0.55);
    appendDensityBlob(densityCtx, point.x, point.y, radius, point.strength);
  }

  const blurred = document.createElement("canvas");
  blurred.width = paintWidth;
  blurred.height = paintHeight;
  const blurredCtx = blurred.getContext("2d");
  if (blurredCtx && typeof blurredCtx.filter === "string") {
    blurredCtx.filter = heatmap.metric === "click" ? "blur(11px)" : "blur(13px)";
    blurredCtx.drawImage(densityCanvas, 0, 0);
    blurredCtx.filter = "none";
    colorizeDensityField(ctx, blurredCtx, heatmap.metric, paintWidth, paintHeight);
    return;
  }

  colorizeDensityField(ctx, densityCtx, heatmap.metric, paintWidth, paintHeight);
}

export function cellsToHeatmapPoints(
  heatmap: ConceptionHeatmapDetailDto,
  width: number,
  height: number
): { points: Array<{ x: number; y: number; value: number }>; max: number } {
  const displayCap = computeDisplayCap(heatmap.cells.map((cell) => cell.count));
  const points: Array<{ x: number; y: number; value: number }> = [];
  let max = 0.001;

  for (const point of buildHeatmapRenderPoints(heatmap, width, height)) {
    const value = Math.max(0.05, point.strength);
    max = Math.max(max, value);
    points.push({ x: point.x, y: point.y, value });
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
