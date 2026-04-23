/** Best-effort duration or timing field from a micro-event payload (milliseconds). */
export function extractPayloadDurationMs(
  eventName: string,
  payload: Record<string, unknown> | null
): number | null {
  if (!payload) return null;
  const keys = ["ms", "duration_ms", "durationMs", "value_ms"] as const;
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  if (eventName === "video_percentage_watched") {
    const d = payload.duration_ms;
    if (typeof d === "number" && Number.isFinite(d)) return d;
  }
  if (eventName === "page_navigation_timing") {
    const load = payload.load_event_end_ms;
    if (typeof load === "number" && Number.isFinite(load)) return load;
  }
  const win = payload.window_ms;
  if (typeof win === "number" && Number.isFinite(win)) return win;
  return null;
}
