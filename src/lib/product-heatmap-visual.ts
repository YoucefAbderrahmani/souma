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
    "0.15": "rgba(224,242,254,0.22)",
    "0.35": "rgba(125,211,252,0.45)",
    "0.55": "rgba(56,189,248,0.62)",
    "0.72": "rgba(37,99,235,0.8)",
    "0.88": "rgba(29,78,216,0.92)",
    "1": "rgba(30,58,138,0.98)",
  },
  click: {
    "0": "rgba(0,0,0,0)",
    "0.12": "rgba(255,247,237,0.2)",
    "0.32": "rgba(253,186,116,0.42)",
    "0.52": "rgba(251,146,60,0.62)",
    "0.72": "rgba(249,115,22,0.8)",
    "0.88": "rgba(234,88,12,0.92)",
    "1": "rgba(194,65,12,0.98)",
  },
  view: {
    "0": "rgba(0,0,0,0)",
    "0.15": "rgba(236,253,245,0.22)",
    "0.35": "rgba(110,231,183,0.45)",
    "0.55": "rgba(52,211,153,0.62)",
    "0.72": "rgba(16,185,129,0.8)",
    "0.88": "rgba(5,150,105,0.92)",
    "1": "rgba(4,120,87,0.98)",
  },
};

export function heatmapRadiusForSize(width: number, height: number) {
  const base = Math.min(width, height);
  return Math.round(Math.max(28, Math.min(92, base * 0.07)));
}

type Rgb = [number, number, number];

const METRIC_PALETTES: Record<ConceptionHeatmapMetric, { stops: Array<{ t: number; rgb: Rgb }> }> = {
  hover: {
    stops: [
      { t: 0, rgb: [224, 242, 254] },
      { t: 0.22, rgb: [125, 211, 252] },
      { t: 0.48, rgb: [56, 189, 248] },
      { t: 0.68, rgb: [37, 99, 235] },
      { t: 0.86, rgb: [29, 78, 216] },
      { t: 1, rgb: [30, 58, 138] },
    ],
  },
  click: {
    stops: [
      { t: 0, rgb: [255, 247, 237] },
      { t: 0.2, rgb: [253, 186, 116] },
      { t: 0.45, rgb: [251, 146, 60] },
      { t: 0.65, rgb: [249, 115, 22] },
      { t: 0.84, rgb: [234, 88, 12] },
      { t: 1, rgb: [194, 65, 12] },
    ],
  },
  view: {
    stops: [
      { t: 0, rgb: [236, 253, 245] },
      { t: 0.22, rgb: [110, 231, 183] },
      { t: 0.48, rgb: [52, 211, 153] },
      { t: 0.68, rgb: [16, 185, 129] },
      { t: 0.86, rgb: [5, 150, 105] },
      { t: 1, rgb: [4, 120, 87] },
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

/** Legend / UI gradients matching the canvas palettes. */
export const HEATMAP_LEGEND_GRADIENT: Record<ConceptionHeatmapMetric, string> = {
  hover:
    "linear-gradient(90deg, #e0f2fe 0%, #7dd3fc 22%, #38bdf8 48%, #2563eb 72%, #1d4ed8 88%, #1e3a8a 100%)",
  click:
    "linear-gradient(90deg, #fff7ed 0%, #fdba74 22%, #fb923c 48%, #f97316 72%, #ea580c 88%, #c2410c 100%)",
  view:
    "linear-gradient(90deg, #ecfdf5 0%, #6ee7b7 22%, #34d399 48%, #10b981 72%, #059669 88%, #047857 100%)",
};

/** Caps hot values so one peak or uniform traffic does not flatten the map (not mean-based). */
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
    if (strength < 0.04) continue;

    const { xPct, yPct } = cellPointerPct(cell, heatmap);
    const { x, y } = heatmapPctToPixel(xPct, yPct, width, height);
    points.push({ x, y, strength });
  }

  return points;
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Rasterize server grid → smooth density field (analytics-style, not blob soup). */
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
  const data = imageData.data;
  let hasSignal = false;

  for (const cell of heatmap.cells) {
    if (cell.x < 0 || cell.y < 0 || cell.x >= gw || cell.y >= gh) continue;
    const strength = cellRenderStrength(cell.count, displayCap);
    if (strength < 0.03) continue;
    const value = Math.round(strength * 255);
    const idx = (cell.y * gw + cell.x) * 4;
    const prev = data[idx];
    const merged = Math.max(prev, value);
    data[idx] = merged;
    data[idx + 1] = merged;
    data[idx + 2] = merged;
    data[idx + 3] = 255;
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

function blurCanvas(source: CanvasRenderingContext2D, width: number, height: number, blurPx: number) {
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
    if (intensity < 0.02) continue;

    const curved = Math.pow(intensity, 0.62);
    const [r, g, b] = samplePalette(metric, curved);
    const alpha = Math.min(255, Math.round(12 + Math.pow(curved, 0.9) * 228));
    dst[i] = r;
    dst[i + 1] = g;
    dst[i + 2] = b;
    dst[i + 3] = alpha;
  }

  target.putImageData(out, 0, 0);
}

function compositeWithBloom(
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

  bloomCtx.filter = "blur(10px)";
  bloomCtx.drawImage(colored, 0, 0);
  bloomCtx.filter = "none";

  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.42;
  ctx.drawImage(bloomCanvas, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(colored, 0, 0);
}

/** Canvas heat for preview iframe — grid-smoothed density + premium palette + bloom. */
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
    const points = buildHeatmapRenderPoints(heatmap, paintWidth, paintHeight);
    if (points.length === 0) return;
    paintPointDensityFallback(ctx, heatmap, points, paintWidth, paintHeight);
    return;
  }

  const blurPx = heatmap.metric === "click" ? 14 : 16;
  const blurred = blurCanvas(gridDensity, paintWidth, paintHeight, blurPx);

  const colored = createCanvas(paintWidth, paintHeight);
  const coloredCtx = colored.getContext("2d");
  if (!coloredCtx) return;

  colorizeDensityField(coloredCtx, blurred, heatmap.metric, paintWidth, paintHeight);
  compositeWithBloom(ctx, colored, paintWidth, paintHeight);
}

function appendDensityBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strength: number
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  const peak = Math.min(1, 0.12 + strength * 0.88);
  gradient.addColorStop(0, `rgba(255,255,255,${peak})`);
  gradient.addColorStop(0.25, `rgba(255,255,255,${peak * 0.55})`);
  gradient.addColorStop(0.55, `rgba(255,255,255,${peak * 0.18})`);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function paintPointDensityFallback(
  ctx: CanvasRenderingContext2D,
  heatmap: ConceptionHeatmapDetailDto,
  points: RenderPoint[],
  paintWidth: number,
  paintHeight: number
) {
  const baseRadius = heatmapRadiusForSize(paintWidth, paintHeight);
  const densityCanvas = createCanvas(paintWidth, paintHeight);
  const densityCtx = densityCanvas.getContext("2d");
  if (!densityCtx) return;

  densityCtx.globalCompositeOperation = "lighter";
  for (const point of points) {
    const radius = baseRadius * (0.85 + point.strength * 0.5);
    appendDensityBlob(densityCtx, point.x, point.y, radius, point.strength);
  }

  const blurred = blurCanvas(densityCtx, paintWidth, paintHeight, 13);
  const colored = createCanvas(paintWidth, paintHeight);
  const coloredCtx = colored.getContext("2d");
  if (!coloredCtx) return;

  colorizeDensityField(coloredCtx, blurred, heatmap.metric, paintWidth, paintHeight);
  compositeWithBloom(ctx, colored, paintWidth, paintHeight);
}

export function cellsToHeatmapPoints(
  heatmap: ConceptionHeatmapDetailDto,
  width: number,
  height: number
): { points: Array<{ x: number; y: number; value: number }>; max: number } {
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
    maxOpacity: 0.88,
    minOpacity: 0.06,
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
      const blur = heatmap.metric === "click" ? 0.88 : 0.96;
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
        maxOpacity: 0.88,
        minOpacity: 0.06,
        blur: 0.96,
        gradient: METRIC_GRADIENTS.hover,
        backgroundColor: "rgba(0,0,0,0)",
      });
    },
  };
}
