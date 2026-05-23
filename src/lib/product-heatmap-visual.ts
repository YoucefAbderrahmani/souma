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

/** heatmap.js gradients — aligned with canvas palettes. */
const METRIC_GRADIENTS: Record<ConceptionHeatmapMetric, Record<string, string>> = {
  hover: {
    "0": "rgba(0,0,0,0)",
    "0.2": "rgba(147,197,253,0.3)",
    "0.42": "rgba(59,130,246,0.52)",
    "0.62": "rgba(99,102,241,0.68)",
    "0.8": "rgba(168,85,247,0.82)",
    "1": "rgba(109,40,217,0.94)",
  },
  click: {
    "0": "rgba(0,0,0,0)",
    "0.18": "rgba(254,240,138,0.28)",
    "0.38": "rgba(251,191,36,0.48)",
    "0.58": "rgba(249,115,22,0.66)",
    "0.78": "rgba(239,68,68,0.82)",
    "1": "rgba(185,28,28,0.94)",
  },
  view: {
    "0": "rgba(0,0,0,0)",
    "0.2": "rgba(167,243,208,0.3)",
    "0.42": "rgba(52,211,153,0.52)",
    "0.62": "rgba(16,185,129,0.68)",
    "0.8": "rgba(5,150,105,0.82)",
    "1": "rgba(6,95,70,0.94)",
  },
};

export function heatmapRadiusForSize(width: number, height: number) {
  const base = Math.min(width, height);
  return Math.round(Math.max(28, Math.min(96, base * 0.065)));
}

type Rgb = [number, number, number];

const METRIC_PALETTES: Record<ConceptionHeatmapMetric, { stops: Array<{ t: number; rgb: Rgb }> }> = {
  hover: {
    stops: [
      { t: 0, rgb: [219, 234, 254] },
      { t: 0.25, rgb: [147, 197, 253] },
      { t: 0.48, rgb: [59, 130, 246] },
      { t: 0.68, rgb: [99, 102, 241] },
      { t: 0.86, rgb: [168, 85, 247] },
      { t: 1, rgb: [109, 40, 217] },
    ],
  },
  click: {
    stops: [
      { t: 0, rgb: [254, 249, 195] },
      { t: 0.22, rgb: [253, 224, 71] },
      { t: 0.45, rgb: [251, 146, 60] },
      { t: 0.65, rgb: [249, 115, 22] },
      { t: 0.84, rgb: [239, 68, 68] },
      { t: 1, rgb: [185, 28, 28] },
    ],
  },
  view: {
    stops: [
      { t: 0, rgb: [209, 250, 229] },
      { t: 0.25, rgb: [110, 231, 183] },
      { t: 0.48, rgb: [52, 211, 153] },
      { t: 0.68, rgb: [16, 185, 129] },
      { t: 0.86, rgb: [5, 150, 105] },
      { t: 1, rgb: [6, 95, 70] },
    ],
  },
};

/** Legend bars matching the canvas palettes. */
export const HEATMAP_LEGEND_GRADIENT: Record<ConceptionHeatmapMetric, string> = {
  hover:
    "linear-gradient(90deg, #dbeafe 0%, #93c5fd 25%, #3b82f6 48%, #6366f1 68%, #a855f7 86%, #6d28d9 100%)",
  click:
    "linear-gradient(90deg, #fef9c3 0%, #fde047 22%, #fb923c 45%, #f97316 65%, #ef4444 84%, #b91c1c 100%)",
  view:
    "linear-gradient(90deg, #d1fae5 0%, #6ee7b7 25%, #34d399 48%, #10b981 68%, #059669 86%, #065f46 100%)",
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

function computeDisplayCap(counts: number[]) {
  if (counts.length === 0) return 1;
  const sorted = [...counts].sort((left, right) => left - right);
  const capIndex = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.88));
  return Math.max(1, sorted[capIndex] ?? sorted[sorted.length - 1] ?? 1);
}

function cellRenderStrength(count: number, displayCap: number) {
  const ratio = Math.min(1, count / displayCap);
  return Math.pow(ratio, 0.7);
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function rasterizeGridDensity(
  heatmap: ConceptionHeatmapDetailDto,
  paintWidth: number,
  paintHeight: number,
  displayCap: number
): CanvasRenderingContext2D | null {
  const gw = Math.max(1, heatmap.gridWidth);
  const gh = Math.max(1, heatmap.gridHeight);
  const gridCanvas = createCanvas(gw, gh);
  const gridCtx = gridCanvas.getContext("2d");
  if (!gridCtx) return null;

  const imageData = gridCtx.createImageData(gw, gh);
  const pixels = imageData.data;
  let hasSignal = false;

  for (const cell of heatmap.cells) {
    if (cell.x < 0 || cell.y < 0 || cell.x >= gw || cell.y >= gh) continue;
    const strength = cellRenderStrength(cell.count, displayCap);
    if (strength < 0.03) continue;
    const value = Math.round(strength * 255);
    const idx = (cell.y * gw + cell.x) * 4;
    const merged = Math.max(pixels[idx], value);
    pixels[idx] = merged;
    pixels[idx + 1] = merged;
    pixels[idx + 2] = merged;
    pixels[idx + 3] = 255;
    if (merged > 0) hasSignal = true;
  }

  if (!hasSignal) return null;

  gridCtx.putImageData(imageData, 0, 0);

  const densityCanvas = createCanvas(paintWidth, paintHeight);
  const densityCtx = densityCanvas.getContext("2d");
  if (!densityCtx) return null;

  densityCtx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in densityCtx) {
    densityCtx.imageSmoothingQuality = "high";
  }
  densityCtx.drawImage(gridCanvas, 0, 0, paintWidth, paintHeight);
  return densityCtx;
}

function blurDensity(
  source: CanvasRenderingContext2D,
  width: number,
  height: number,
  blurPx: number
): CanvasRenderingContext2D {
  const blurred = createCanvas(width, height);
  const blurredCtx = blurred.getContext("2d");
  if (!blurredCtx || typeof blurredCtx.filter !== "string") {
    return source;
  }
  blurredCtx.filter = `blur(${blurPx}px)`;
  blurredCtx.drawImage(source.canvas, 0, 0);
  blurredCtx.filter = "none";
  return blurredCtx;
}

function colorizeDensity(
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
    if (intensity < 0.018) continue;

    const curved = Math.pow(intensity, 0.58);
    const [r, g, b] = samplePalette(metric, curved);
    const alpha = Math.min(255, Math.round(10 + Math.pow(curved, 0.88) * 232));
    dst[i] = r;
    dst[i + 1] = g;
    dst[i + 2] = b;
    dst[i + 3] = alpha;
  }

  target.putImageData(out, 0, 0);
}

function compositeColoredWithGlow(
  ctx: CanvasRenderingContext2D,
  colored: HTMLCanvasElement,
  width: number,
  height: number
) {
  const bloomCanvas = createCanvas(width, height);
  const bloomCtx = bloomCanvas.getContext("2d");
  if (!bloomCtx || typeof bloomCtx.filter !== "string") {
    ctx.drawImage(colored, 0, 0);
    return;
  }

  bloomCtx.filter = "blur(9px)";
  bloomCtx.drawImage(colored, 0, 0);
  bloomCtx.filter = "none";

  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.38;
  ctx.drawImage(bloomCanvas, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(colored, 0, 0);
}

function paintPointFallback(
  ctx: CanvasRenderingContext2D,
  heatmap: ConceptionHeatmapDetailDto,
  paintWidth: number,
  paintHeight: number,
  displayCap: number
) {
  const radius = heatmapRadiusForSize(paintWidth, paintHeight);
  const densityCanvas = createCanvas(paintWidth, paintHeight);
  const densityCtx = densityCanvas.getContext("2d");
  if (!densityCtx) return;

  densityCtx.globalCompositeOperation = "lighter";

  for (const cell of heatmap.cells) {
    const strength = cellRenderStrength(cell.count, displayCap);
    if (strength < 0.04) continue;

    const { xPct, yPct } = cellPointerPct(cell, heatmap);
    const { x, y } = heatmapPctToPixel(xPct, yPct, paintWidth, paintHeight);
    const peak = 0.12 + strength * 0.88;
    const r = radius * (0.85 + strength * 0.45);
    const gradient = densityCtx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, `rgba(255,255,255,${peak})`);
    gradient.addColorStop(0.35, `rgba(255,255,255,${peak * 0.45})`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    densityCtx.fillStyle = gradient;
    densityCtx.beginPath();
    densityCtx.arc(x, y, r, 0, Math.PI * 2);
    densityCtx.fill();
  }

  const blurred = blurDensity(densityCtx, paintWidth, paintHeight, 14);
  const colored = createCanvas(paintWidth, paintHeight);
  const coloredCtx = colored.getContext("2d");
  if (!coloredCtx) return;

  colorizeDensity(coloredCtx, blurred, heatmap.metric, paintWidth, paintHeight);
  compositeColoredWithGlow(ctx, colored, paintWidth, paintHeight);
}

/** Premium grid-smoothed heatmap for the preview iframe (stable + high quality). */
export function paintHeatmapCanvas2d(
  ctx: CanvasRenderingContext2D,
  heatmap: ConceptionHeatmapDetailDto,
  width: number,
  height: number
) {
  const paintWidth = Math.max(1, Math.round(width));
  const paintHeight = Math.max(1, Math.round(height));
  ctx.clearRect(0, 0, paintWidth, paintHeight);

  const displayCap = computeDisplayCap(heatmap.cells.map((cell) => cell.count));
  const gridDensity = rasterizeGridDensity(heatmap, paintWidth, paintHeight, displayCap);

  if (!gridDensity) {
    paintPointFallback(ctx, heatmap, paintWidth, paintHeight, displayCap);
    return;
  }

  const blurPx = heatmap.metric === "click" ? 13 : 15;
  const blurred = blurDensity(gridDensity, paintWidth, paintHeight, blurPx);
  const colored = createCanvas(paintWidth, paintHeight);
  const coloredCtx = colored.getContext("2d");
  if (!coloredCtx) return;

  colorizeDensity(coloredCtx, blurred, heatmap.metric, paintWidth, paintHeight);
  compositeColoredWithGlow(ctx, colored, paintWidth, paintHeight);
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
    if (strength < 0.04) continue;

    const { xPct, yPct } = cellPointerPct(cell, heatmap);
    const { x, y } = heatmapPctToPixel(xPct, yPct, width, height);
    const value = Math.max(0.05, strength);
    max = Math.max(max, value);
    points.push({ x, y, value });
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
    maxOpacity: 0.9,
    minOpacity: 0.05,
    blur: 0.96,
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
        blur: heatmap.metric === "click" ? 0.88 : 0.96,
        maxOpacity: 0.9,
        minOpacity: 0.05,
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
        minOpacity: 0.05,
        blur: 0.96,
        gradient: METRIC_GRADIENTS.hover,
        backgroundColor: "rgba(0,0,0,0)",
      });
    },
  };
}
