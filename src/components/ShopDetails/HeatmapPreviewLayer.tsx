"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getProductHeatmapSurfacePaintSize,
  PRODUCT_HEATMAP_SURFACE_ATTR,
} from "@/lib/product-heatmap-surface";
import { isHeatmapPreviewMessage } from "@/lib/product-heatmap-preview-bridge";
import { paintHeatmapCanvas2d } from "@/lib/product-heatmap-visual";
import type { ConceptionHeatmapDetailDto } from "@/types/conception-heatmap";

/**
 * Heat layer drawn inside the product surface (preview iframe).
 * Survives ShopDetails re-renders and aligns with tracked x_pct / y_pct.
 */
export function HeatmapPreviewLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [heatmap, setHeatmap] = useState<ConceptionHeatmapDetailDto | null>(null);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heatmap?.cells.length) return;

    const surface = canvas.parentElement?.closest(
      `[${PRODUCT_HEATMAP_SURFACE_ATTR}]`
    ) as HTMLElement | null;
    if (!surface) return;

    const { width, height } = getProductHeatmapSurfacePaintSize(surface);
    if (width <= 0 || height <= 0) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintHeatmapCanvas2d(ctx, heatmap, width, height);
  }, [heatmap]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isHeatmapPreviewMessage(event.data)) return;
      setHeatmap(event.data.heatmap);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useLayoutEffect(() => {
    repaint();
  }, [repaint]);

  useEffect(() => {
    const surface = canvasRef.current?.parentElement?.closest(
      `[${PRODUCT_HEATMAP_SURFACE_ATTR}]`
    ) as HTMLElement | null;
    if (!surface) return;
    const observer = new ResizeObserver(() => repaint());
    observer.observe(surface);
    return () => observer.disconnect();
  }, [repaint]);

  if (!heatmap?.cells.length) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[2147483646]"
      style={{
        mixBlendMode: "normal",
        opacity: 0.88,
        filter: "saturate(1.08) contrast(1.04)",
      }}
    />
  );
}
