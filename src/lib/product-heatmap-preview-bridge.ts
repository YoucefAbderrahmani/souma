import type { ConceptionHeatmapDetailDto } from "@/types/conception-heatmap";

export const HEATMAP_PREVIEW_MESSAGE = "seller-helper:heatmap-preview" as const;
export const HEATMAP_PREVIEW_READY_MESSAGE = "seller-helper:heatmap-preview-ready" as const;

export type HeatmapPreviewMessage = {
  type: typeof HEATMAP_PREVIEW_MESSAGE;
  heatmap: ConceptionHeatmapDetailDto | null;
};

export type HeatmapPreviewReadyMessage = {
  type: typeof HEATMAP_PREVIEW_READY_MESSAGE;
};

export function isHeatmapPreviewMessage(data: unknown): data is HeatmapPreviewMessage {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  return record.type === HEATMAP_PREVIEW_MESSAGE;
}

export function isHeatmapPreviewReadyMessage(data: unknown): data is HeatmapPreviewReadyMessage {
  if (!data || typeof data !== "object") return false;
  return (data as Record<string, unknown>).type === HEATMAP_PREVIEW_READY_MESSAGE;
}

export function postHeatmapToPreviewIframe(
  iframe: HTMLIFrameElement | null,
  heatmap: ConceptionHeatmapDetailDto | null
) {
  const win = iframe?.contentWindow;
  if (!win) return;
  const payload: HeatmapPreviewMessage = { type: HEATMAP_PREVIEW_MESSAGE, heatmap };
  win.postMessage(payload, window.location.origin);
}

/** Iframe asks parent to resend heatmap (listener mounted / surface ready). */
export function postHeatmapPreviewReadyFromIframe() {
  if (typeof window === "undefined" || window.parent === window) return;
  const payload: HeatmapPreviewReadyMessage = { type: HEATMAP_PREVIEW_READY_MESSAGE };
  window.parent.postMessage(payload, window.location.origin);
}
