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

function scheduleDebounced(fn: () => void, ms: number, slot: { id: number | null }) {
  if (slot.id != null) window.clearTimeout(slot.id);
  slot.id = window.setTimeout(() => {
    slot.id = null;
    fn();
  }, ms);
}

/**
 * Heat layer inside the preview iframe. Keeps the last good heatmap visible during
 * resize/refresh so the overlay does not blink off between postMessage updates.
 */
export function HeatmapPreviewLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastHeatmapRef = useRef<ConceptionHeatmapDetailDto | null>(null);
  const [heatmap, setHeatmap] = useState<ConceptionHeatmapDetailDto | null>(null);
  const [surface, setSurface] = useState<HTMLElement | null>(null);
  const readySentRef = useRef(false);
  const paintSizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const repaintRafRef = useRef<number | null>(null);
  const resizeDebounceRef = useRef<{ id: number | null }>({ id: null });

  const displayHeatmap = heatmap ?? lastHeatmapRef.current;

  const findSurface = useCallback(() => {
    const el = document.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`);
    if (el instanceof HTMLElement) {
      setSurface((prev) => (prev === el ? prev : el));
      return true;
    }
    setSurface((prev) => (prev === null ? prev : null));
    return false;
  }, []);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const data = displayHeatmap;
    if (!canvas || !data?.cells.length) return;

    const host =
      surface ??
      (document.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null);
    if (!host || !host.isConnected) return;

    const { width, height } = getProductHeatmapSurfacePaintSize(host);
    if (width <= 0 || height <= 0) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    const prev = paintSizeRef.current;

    if (prev.width !== pixelWidth || prev.height !== pixelHeight || prev.dpr !== dpr) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      paintSizeRef.current = { width: pixelWidth, height: pixelHeight, dpr };
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintHeatmapCanvas2d(ctx, data, width, height);
  }, [displayHeatmap, surface]);

  const scheduleRepaint = useCallback(() => {
    if (repaintRafRef.current != null) return;
    repaintRafRef.current = window.requestAnimationFrame(() => {
      repaintRafRef.current = null;
      repaint();
    });
  }, [repaint]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isHeatmapPreviewMessage(event.data)) return;

      const next = event.data.heatmap;
      if (!next) return;

      if (next.cells.length > 0) {
        lastHeatmapRef.current = next;
        setHeatmap(next);
        scheduleRepaint();
        return;
      }

      lastHeatmapRef.current = null;
      setHeatmap(next);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [scheduleRepaint]);

  useEffect(() => {
    findSurface();
    const observer = new MutationObserver(() => findSurface());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [findSurface]);

  useLayoutEffect(() => {
    scheduleRepaint();
  }, [scheduleRepaint, displayHeatmap, surface]);

  useEffect(() => {
    if (!surface) return;
    const observer = new ResizeObserver(() => {
      scheduleDebounced(scheduleRepaint, 120, resizeDebounceRef.current);
    });
    observer.observe(surface);
    return () => {
      observer.disconnect();
      const debounce = resizeDebounceRef.current;
      if (debounce.id != null) window.clearTimeout(debounce.id);
    };
  }, [scheduleRepaint, surface]);

  useEffect(() => {
    if (readySentRef.current) return;
    readySentRef.current = true;
    postHeatmapPreviewReadyFromIframe();
  }, []);

  useEffect(() => {
    if (!displayHeatmap?.cells.length || !surface) return;
    postHeatmapPreviewReadyFromIframe();
  }, [displayHeatmap?.productId, displayHeatmap?.metric, surface]);

  if (!displayHeatmap?.cells.length || !surface) return null;

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
