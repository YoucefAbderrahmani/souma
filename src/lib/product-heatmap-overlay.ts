"use client";

import type { ConceptionHeatmapDetailDto } from "@/types/conception-heatmap";
import {
  getProductHeatmapSurfacePaintSize,
  PRODUCT_HEATMAP_SURFACE_ATTR,
} from "@/lib/product-heatmap-surface";
import {
  createGaussianHeatmapRenderer,
  type GaussianHeatmapRenderer,
} from "@/lib/product-heatmap-visual";

export const PRODUCT_HEATMAP_OVERLAY_ATTR = "data-product-heatmap-overlay";

export type HeatmapStageLayout = {
  surfaceWidth: number;
  surfaceHeight: number;
  surfaceOffsetLeft: number;
  surfaceOffsetTop: number;
};

const STAGE_OVERLAY_LAYER_ATTR = "data-product-heatmap-overlay-layer";
const IFRAME_OVERLAY_LAYER_ATTR = "data-product-heatmap-iframe-overlay";

async function mountGaussianLayer(container: HTMLElement): Promise<GaussianHeatmapRenderer> {
  const layer = document.createElement("div");
  layer.setAttribute(STAGE_OVERLAY_LAYER_ATTR, "");
  layer.setAttribute("aria-hidden", "true");
  layer.style.position = "absolute";
  layer.style.left = "0";
  layer.style.top = "0";
  layer.style.width = "100%";
  layer.style.height = "100%";
  layer.style.pointerEvents = "none";
  layer.style.overflow = "hidden";
  layer.style.mixBlendMode = "multiply";
  layer.style.opacity = "0.9";
  container.appendChild(layer);
  return createGaussianHeatmapRenderer(layer);
}

/**
 * Overlay lives in the same scaled stage as the iframe so page + heat share one transform.
 */
export function syncStageHeatmapOverlay(
  stage: HTMLElement,
  iframe: HTMLIFrameElement,
  layout: HeatmapStageLayout,
  heatmap: ConceptionHeatmapDetailDto | null
): () => void {
  let mountLayer = stage.querySelector(`[${STAGE_OVERLAY_LAYER_ATTR}]`) as HTMLDivElement | null;
  let renderer: GaussianHeatmapRenderer | null = null;
  let rendererReady: Promise<GaussianHeatmapRenderer | null> | null = null;
  let raf = 0;
  let cancelled = false;

  const teardown = () => {
    cancelled = true;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    renderer?.destroy();
    renderer = null;
    rendererReady = null;
    mountLayer?.remove();
    mountLayer = null;
  };

  if (!heatmap) {
    teardown();
    return () => {};
  }

  cancelled = false;

  const ensureRenderer = () => {
    if (renderer) return Promise.resolve(renderer);
    if (!rendererReady) {
      if (!mountLayer) {
        mountLayer = document.createElement("div");
        mountLayer.setAttribute(STAGE_OVERLAY_LAYER_ATTR, "");
        mountLayer.style.position = "absolute";
        mountLayer.style.left = "0";
        mountLayer.style.top = "0";
        mountLayer.style.pointerEvents = "none";
        mountLayer.style.zIndex = "20";
        mountLayer.style.overflow = "hidden";
        stage.appendChild(mountLayer);
      }
      rendererReady = mountGaussianLayer(mountLayer).then((instance) => {
        if (cancelled) {
          instance.destroy();
          return null;
        }
        renderer = instance;
        return instance;
      });
    }
    return rendererReady;
  };

  const sync = () => {
    void ensureRenderer().then((instance) => {
      if (!instance || !mountLayer) return;

      const width = layout.surfaceWidth;
      const height = layout.surfaceHeight;

      if (width <= 0 || height <= 0) {
        mountLayer.style.display = "none";
        return;
      }

      mountLayer.style.display = "block";
      mountLayer.style.left = "0";
      mountLayer.style.top = "0";
      mountLayer.style.width = `${width}px`;
      mountLayer.style.height = `${height}px`;

      instance.repaint(heatmap, width, height);
    });
  };

  const scheduleSync = () => {
    if (raf) window.cancelAnimationFrame(raf);
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      sync();
    });
  };

  scheduleSync();

  const stageObserver = new ResizeObserver(scheduleSync);
  stageObserver.observe(stage);

  const doc = iframe.contentDocument;
  const surface = doc?.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null;
  const surfaceObserver = surface ? new ResizeObserver(scheduleSync) : null;
  surfaceObserver?.observe(surface);

  const win = doc?.defaultView;
  const onScroll = () => scheduleSync();
  win?.addEventListener("scroll", onScroll, { passive: true });
  win?.addEventListener("resize", onScroll, { passive: true });

  return () => {
    stageObserver.disconnect();
    surfaceObserver?.disconnect();
    win?.removeEventListener("scroll", onScroll);
    win?.removeEventListener("resize", onScroll);
    teardown();
  };
}

/** In-iframe overlay — drawn on the product surface inside the preview iframe. */
export function syncProductHeatmapOverlay(
  doc: Document,
  heatmap: ConceptionHeatmapDetailDto | null
) {
  const surface = doc.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null;
  if (!surface) return () => {};

  let mountHost = surface.querySelector(`[${IFRAME_OVERLAY_LAYER_ATTR}]`) as HTMLDivElement | null;
  let renderer: GaussianHeatmapRenderer | null = null;
  let rendererReady: Promise<GaussianHeatmapRenderer | null> | null = null;
  let cancelled = false;

  const teardown = () => {
    cancelled = true;
    renderer?.destroy();
    renderer = null;
    mountHost?.remove();
    mountHost = null;
    surface.querySelector(`canvas[${PRODUCT_HEATMAP_OVERLAY_ATTR}]`)?.remove();
  };

  if (!heatmap) {
    teardown();
    return () => {};
  }

  const surfaceStyle = doc.defaultView?.getComputedStyle(surface);
  if (surfaceStyle?.position === "static") {
    surface.style.position = "relative";
  }

  const ensureRenderer = () => {
    if (renderer) return Promise.resolve(renderer);
    if (!rendererReady) {
      if (!mountHost) {
        mountHost = document.createElement("div");
        mountHost.setAttribute(IFRAME_OVERLAY_LAYER_ATTR, "");
        mountHost.style.position = "absolute";
        mountHost.style.left = "0";
        mountHost.style.top = "0";
        mountHost.style.right = "auto";
        mountHost.style.bottom = "auto";
        mountHost.style.pointerEvents = "none";
        mountHost.style.zIndex = "2147483646";
        mountHost.style.overflow = "hidden";
        surface.appendChild(mountHost);
      }
      rendererReady = mountGaussianLayer(mountHost).then((instance) => {
        if (cancelled) {
          instance.destroy();
          return null;
        }
        renderer = instance;
        return instance;
      });
    }
    return rendererReady;
  };

  const draw = () => {
    const { width, height } = getProductHeatmapSurfacePaintSize(surface);
    if (width <= 0 || height <= 0) {
      if (mountHost) mountHost.style.display = "none";
      return;
    }
    if (mountHost) {
      mountHost.style.display = "block";
      mountHost.style.width = `${width}px`;
      mountHost.style.height = `${height}px`;
    }
    void ensureRenderer().then((instance) => {
      if (!instance) return;
      instance.repaint(heatmap, width, height);
    });
  };

  draw();

  const observer = new ResizeObserver(() => draw());
  observer.observe(surface);

  return () => {
    observer.disconnect();
    teardown();
  };
}
