import type { ConceptionHeatmapDetailDto } from "@/types/conception-heatmap";

export const HEATMAP_PREVIEW_MESSAGE = "seller-helper:heatmap-preview" as const;

export type HeatmapPreviewMessage = {
  type: typeof HEATMAP_PREVIEW_MESSAGE;
  heatmap: ConceptionHeatmapDetailDto | null;
};

export function isHeatmapPreviewMessage(data: unknown): data is HeatmapPreviewMessage {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  return record.type === HEATMAP_PREVIEW_MESSAGE;
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
