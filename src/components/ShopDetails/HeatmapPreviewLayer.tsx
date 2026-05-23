"use client";

import { useEffect, useState } from "react";
import { syncProductHeatmapOverlay } from "@/lib/product-heatmap-overlay";
import { isHeatmapPreviewMessage } from "@/lib/product-heatmap-preview-bridge";
import type { ConceptionHeatmapDetailDto } from "@/types/conception-heatmap";

/**
 * Renders heatmap.js inside the product surface (preview iframe).
 * Uses the same Gaussian renderer as analytics overlays — not a custom canvas path.
 */
export function HeatmapPreviewLayer() {
  const [heatmap, setHeatmap] = useState<ConceptionHeatmapDetailDto | null>(null);

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
    const payload =
      heatmap?.cells.length ? heatmap : null;
    return syncProductHeatmapOverlay(document, payload);
  }, [heatmap]);

  return null;
}
