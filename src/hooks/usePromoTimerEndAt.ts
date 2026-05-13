"use client";

import { useEffect, useState } from "react";

/**
 * Persists promo end time in `sessionStorage` under `storageKey` so the countdown is stable per session.
 */
export function usePromoTimerEndAt(storageKey: string, defaultDurationMs: number): number | null {
  const [endAt, setEndAt] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = sessionStorage.getItem(storageKey);
    if (existing) {
      setEndAt(Number(existing));
      return;
    }
    const ends = Date.now() + defaultDurationMs;
    sessionStorage.setItem(storageKey, String(ends));
    setEndAt(ends);
  }, [storageKey, defaultDurationMs]);

  return endAt;
}
