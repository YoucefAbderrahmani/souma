"use client";

import { useEffect } from "react";

export const LIVE_DATA_REFRESH_MS = 5_000;

export function useLiveDataRefresh(
  refresh: () => void | Promise<void>,
  enabled = true,
  intervalMs = LIVE_DATA_REFRESH_MS
) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: number | null = null;

    const run = () => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    };

    const start = () => {
      if (timer) return;
      timer = window.setInterval(run, intervalMs);
    };

    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
        return;
      }
      run();
      start();
    };

    run();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", run);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", run);
    };
  }, [enabled, intervalMs, refresh]);
}
