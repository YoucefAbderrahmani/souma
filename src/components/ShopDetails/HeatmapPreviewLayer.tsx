"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getProductHeatmapSurfacePaintSize,
  PRODUCT_HEATMAP_SURFACE_ATTR,
} from "@/lib/product-heatmap-surface";
import {
  isHeatmapPreviewMessage,
  postHeatmapPreviewReadyFromIframe,
} from "@/lib/product-heatmap-preview-bridge";
import {
  createGaussianHeatmapRenderer,
  type GaussianHeatmapRenderer,
} from "@/lib/product-heatmap-visual";
import type { ConceptionHeatmapDetailDto } from "@/types/conception-heatmap";

function scheduleDebounced(fn: () => void, ms: number, slot: { id: number | null }) {
  if (slot.id != null) window.clearTimeout(slot.id);
  slot.id = window.setTimeout(() => {
    slot.id = null;
    fn();
  }, ms);
}

/**
 * heatmap.js inside the preview iframe — industry-standard Gaussian heat + stable sticky data.
 */
export function HeatmapPreviewLayer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GaussianHeatmapRenderer | null>(null);
  const rendererInitRef = useRef<Promise<GaussianHeatmapRenderer | null> | null>(null);
  const lastHeatmapRef = useRef<ConceptionHeatmapDetailDto | null>(null);
  const [heatmap, setHeatmap] = useState<ConceptionHeatmapDetailDto | null>(null);
  const [surface, setSurface] = useState<HTMLElement | null>(null);
  const readySentRef = useRef(false);
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

  const teardownRenderer = useCallback(() => {
    rendererRef.current?.destroy();
    rendererRef.current = null;
    rendererInitRef.current = null;
  }, []);

  const syncHeatmapRender = useCallback(() => {
    const host = hostRef.current;
    const data = displayHeatmap;
    const targetSurface =
      surface ??
      (document.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null);

    if (!host || !data?.cells.length || !targetSurface?.isConnected) return;

    const { width, height } = getProductHeatmapSurfacePaintSize(targetSurface);
    if (width <= 0 || height <= 0) return;

    const paint = () => {
      rendererRef.current?.repaint(data, width, height);
    };

    if (rendererRef.current) {
      paint();
      return;
    }

    if (!rendererInitRef.current) {
      rendererInitRef.current = createGaussianHeatmapRenderer(host)
        .then((instance) => {
          rendererRef.current = instance;
          return instance;
        })
        .catch(() => null);
    }

    void rendererInitRef.current.then((instance) => {
      if (instance) paint();
    });
  }, [displayHeatmap, surface]);

  const scheduleSync = useCallback(() => {
    scheduleDebounced(syncHeatmapRender, 80, resizeDebounceRef.current);
  }, [syncHeatmapRender]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isHeatmapPreviewMessage(event.data)) return;

      const next = event.data.heatmap;
      if (!next) return;

      if (next.cells.length > 0) {
        lastHeatmapRef.current = next;
        setHeatmap(next);
        scheduleSync();
        return;
      }

      lastHeatmapRef.current = null;
      setHeatmap(next);
      teardownRenderer();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [scheduleSync, teardownRenderer]);

  useEffect(() => {
    findSurface();
    const observer = new MutationObserver(() => findSurface());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [findSurface]);

  useEffect(() => {
    scheduleSync();
  }, [scheduleSync, displayHeatmap, surface]);

  useEffect(() => {
    if (!surface) return;
    const observer = new ResizeObserver(() => scheduleSync());
    observer.observe(surface);
    return () => {
      observer.disconnect();
      const debounce = resizeDebounceRef.current;
      if (debounce.id != null) window.clearTimeout(debounce.id);
    };
  }, [scheduleSync, surface]);

  useEffect(() => {
    return () => teardownRenderer();
  }, [surface, teardownRenderer]);

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
    <div
      ref={hostRef}
      data-heatmap-preview-host=""
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[2147483646] overflow-hidden"
      style={{
        width: "100%",
        height: "100%",
        mixBlendMode: "multiply",
        opacity: 0.88,
      }}
    />,
    surface
  );
}
