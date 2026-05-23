"use client";

import { useLayoutEffect, useRef } from "react";
import type { ConceptionHeatmapDetailDto } from "@/types/conception-heatmap";
import { createGaussianHeatmapRenderer, type GaussianHeatmapRenderer } from "@/lib/product-heatmap-visual";

type HeatmapCanvasOverlayProps = {
  heatmap: ConceptionHeatmapDetailDto;
  width: number;
  height: number;
};

/**
 * Heatmap layer as a React sibling of the preview iframe so reconciliation
 * does not strip imperative DOM overlays on parent re-renders.
 */
export function HeatmapCanvasOverlay({ heatmap, width, height }: HeatmapCanvasOverlayProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GaussianHeatmapRenderer | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || width <= 0 || height <= 0) return;

    let cancelled = false;

    const paint = () => {
      const renderer = rendererRef.current;
      if (!renderer || cancelled) return;
      renderer.repaint(heatmap, width, height);
    };

    if (rendererRef.current) {
      paint();
      return () => {
        cancelled = true;
      };
    }

    void createGaussianHeatmapRenderer(host).then((renderer) => {
      if (cancelled || !hostRef.current) {
        renderer.destroy();
        return;
      }
      rendererRef.current = renderer;
      paint();
    });

    return () => {
      cancelled = true;
    };
  }, [heatmap, width, height]);

  useLayoutEffect(
    () => () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    },
    []
  );

  if (width <= 0 || height <= 0 || heatmap.cells.length === 0) {
    return null;
  }

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-20 overflow-hidden"
      style={{
        width: Math.round(width),
        height: Math.round(height),
        mixBlendMode: "multiply",
      }}
    />
  );
}
