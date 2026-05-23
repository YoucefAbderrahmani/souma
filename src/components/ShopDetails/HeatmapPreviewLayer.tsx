"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getProductHeatmapSurfacePaintSize,
  PRODUCT_HEATMAP_SURFACE_ATTR,
} from "@/lib/product-heatmap-surface";
import {
  isHeatmapPreviewMessage,
  postHeatmapPreviewReadyFromIframe,
} from "@/lib/product-heatmap-preview-bridge";
import { paintHeatmapCanvas2d } from "@/lib/product-heatmap-visual";
import type { ConceptionHeatmapDetailDto } from "@/types/conception-heatmap";

/**
 * Heat layer inside the preview iframe. Mounted for all heatmap preview loads so
 * postMessage is never missed; paints via portal once the product surface exists.
 */
export function HeatmapPreviewLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [heatmap, setHeatmap] = useState<ConceptionHeatmapDetailDto | null>(null);
  const [surface, setSurface] = useState<HTMLElement | null>(null);

  const findSurface = useCallback(() => {
    const el = document.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`);
    if (el instanceof HTMLElement) {
      setSurface((prev) => (prev === el ? prev : el));
      return true;
    }
    return false;
  }, []);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heatmap?.cells.length) return;

    const host =
      surface ??
      (document.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null);
    if (!host) return;

    const { width, height } = getProductHeatmapSurfacePaintSize(host);
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
  }, [heatmap, surface]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isHeatmapPreviewMessage(event.data)) return;
      setHeatmap(event.data.heatmap);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    findSurface();
    const observer = new MutationObserver(() => findSurface());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [findSurface]);

  useLayoutEffect(() => {
    repaint();
    const raf = window.requestAnimationFrame(() => repaint());
    return () => window.cancelAnimationFrame(raf);
  }, [repaint]);

  useEffect(() => {
    if (!surface) return;
    const observer = new ResizeObserver(() => repaint());
    observer.observe(surface);
    return () => observer.disconnect();
  }, [repaint, surface]);

  useEffect(() => {
    postHeatmapPreviewReadyFromIframe();
  }, []);

  useEffect(() => {
    if (!heatmap?.cells.length) return;
    postHeatmapPreviewReadyFromIframe();
    const timer = window.setTimeout(() => postHeatmapPreviewReadyFromIframe(), 120);
    return () => window.clearTimeout(timer);
  }, [heatmap, surface]);

  if (!heatmap?.cells.length || !surface) return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      data-heatmap-preview-canvas=""
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[2147483646]"
      style={{ mixBlendMode: "multiply", opacity: 0.85 }}
    />,
    surface
  );
}
