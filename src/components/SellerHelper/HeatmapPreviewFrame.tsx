"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConceptionHeatmapDetailDto } from "@/types/conception-heatmap";
import {
  applyProductHeatmapPreviewFrame,
  measureProductHeatmapPreviewSurface,
  PRODUCT_HEATMAP_SURFACE_ATTR,
} from "@/lib/product-heatmap-surface";
import {
  computeHeatmapPreviewFit,
  toPreviewFrameGeometry,
  type HeatmapPreviewFrameGeometry,
} from "@/lib/product-heatmap-preview-frame";
import { postHeatmapToPreviewIframe } from "@/lib/product-heatmap-preview-bridge";

type HeatmapPreviewFrameProps = {
  previewSrc: string;
  heatmap: ConceptionHeatmapDetailDto | null;
  productTitle: string;
};

export function HeatmapPreviewFrame({ previewSrc, heatmap, productTitle }: HeatmapPreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [geometry, setGeometry] = useState<HeatmapPreviewFrameGeometry | null>(null);
  const [fit, setFit] = useState({ scale: 1, viewportWidth: 320, viewportHeight: 240 });

  const updateFit = useCallback(() => {
    const container = containerRef.current;
    if (!container || !geometry) return;
    const availableWidth = Math.max(1, container.clientWidth - 16);
    const availableHeight = Math.max(1, container.clientHeight - 16);
    setFit(computeHeatmapPreviewFit(availableWidth, availableHeight, geometry));
  }, [geometry]);

  const measureIframe = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return false;

    const measured = measureProductHeatmapPreviewSurface(doc);
    if (!measured) return false;

    applyProductHeatmapPreviewFrame(doc, measured);
    setGeometry(toPreviewFrameGeometry(measured));
    return true;
  }, []);

  const pushHeatmapToIframe = useCallback(() => {
    postHeatmapToPreviewIframe(iframeRef.current, heatmap);
  }, [heatmap]);

  useEffect(() => {
    setGeometry(null);
  }, [previewSrc]);

  useEffect(() => {
    updateFit();
  }, [geometry, updateFit]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => updateFit());
    observer.observe(container);
    return () => observer.disconnect();
  }, [updateFit]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let pollId: number | null = null;
    let attempts = 0;
    let surfaceObserver: ResizeObserver | null = null;

    const tryMeasure = () => {
      if (measureIframe()) {
        if (pollId != null) window.clearInterval(pollId);
        pushHeatmapToIframe();
        return true;
      }
      return false;
    };

    const attachSurfaceObserver = () => {
      const doc = iframe.contentDocument;
      const surface = doc?.querySelector(`[${PRODUCT_HEATMAP_SURFACE_ATTR}]`) as HTMLElement | null;
      if (!surface) return false;

      surfaceObserver?.disconnect();
      surfaceObserver = new ResizeObserver(() => {
        if (measureIframe()) pushHeatmapToIframe();
      });
      surfaceObserver.observe(surface);
      return tryMeasure();
    };

    const onLoad = () => {
      if (!attachSurfaceObserver()) {
        pollId = window.setInterval(() => {
          attempts += 1;
          if (attachSurfaceObserver() || attempts >= 100) {
            if (pollId != null) window.clearInterval(pollId);
          }
        }, 120);
      }
    };

    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") {
      onLoad();
    }

    return () => {
      iframe.removeEventListener("load", onLoad);
      surfaceObserver?.disconnect();
      if (pollId != null) window.clearInterval(pollId);
    };
  }, [measureIframe, previewSrc, pushHeatmapToIframe]);

  useEffect(() => {
    if (!geometry) return;
    const timer = window.setTimeout(() => pushHeatmapToIframe(), 280);
    return () => window.clearTimeout(timer);
  }, [geometry, heatmap, pushHeatmapToIframe]);

  const iframeTransform =
    geometry ?
      `translate(${-Math.round(geometry.offsetLeft * fit.scale)}px, ${-Math.round(geometry.offsetTop * fit.scale)}px) scale(${fit.scale})`
    : undefined;

  return (
    <div
      ref={containerRef}
      className="relative flex h-[min(56vh,600px)] w-full items-center justify-center overflow-hidden bg-gray-1 p-2"
    >
      <div
        className="relative overflow-hidden rounded-sm border border-gray-3 bg-white shadow-sm"
        style={{
          width: geometry ? fit.viewportWidth : "100%",
          height: geometry ? fit.viewportHeight : "min(52vh, 560px)",
          maxWidth: "100%",
        }}
      >
        {!geometry ?
          <div className="flex h-full min-h-[240px] items-center justify-center text-xs text-dark-4">
            Loading product preview…
          </div>
        : null}
        <iframe
          key={previewSrc}
          ref={iframeRef}
          title={`Heatmap preview for ${productTitle}`}
          src={previewSrc}
          scrolling="no"
          className="absolute left-0 top-0 block border-0 bg-white"
          style={{
            width: geometry?.documentWidth ?? 1280,
            height: geometry?.documentHeight ?? 1800,
            transform: iframeTransform,
            transformOrigin: "top left",
            visibility: geometry ? "visible" : "hidden",
          }}
        />
      </div>
    </div>
  );
}
