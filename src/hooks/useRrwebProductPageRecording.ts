"use client";

import { useEffect, useRef } from "react";
import type { eventWithTime } from "@rrweb/types";
import { record } from "rrweb";
import {
  FLUSH_EVENT_COUNT,
  FLUSH_MS,
  flushRrwebProductEvents,
} from "@/lib/rrweb-product-recording";

type Args = {
  productId: number | null;
  enabled?: boolean;
};

export function useRrwebProductPageRecording({ productId, enabled = true }: Args) {
  const bufferRef = useRef<eventWithTime[]>([]);
  const productIdRef = useRef(productId);
  productIdRef.current = productId;

  useEffect(() => {
    if (!enabled || productId == null || productId <= 0 || typeof window === "undefined") {
      return;
    }

    bufferRef.current = [];
    let flushTimer: ReturnType<typeof setInterval> | null = null;

    const flush = () => {
      const id = productIdRef.current;
      const batch = bufferRef.current.splice(0, bufferRef.current.length);
      if (id == null || batch.length === 0) return;
      void flushRrwebProductEvents(id, batch).catch(() => {});
    };

    const stop = record({
      emit(event) {
        bufferRef.current.push(event);
        if (bufferRef.current.length >= FLUSH_EVENT_COUNT) flush();
      },
      maskAllInputs: true,
      sampling: {
        mousemove: 50,
        mouseInteraction: true,
        scroll: 150,
        media: 800,
        input: "last",
      },
    });

    flushTimer = setInterval(flush, FLUSH_MS);

    const onPageHide = () => flush();
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (flushTimer) clearInterval(flushTimer);
      flush();
      stop?.();
    };
  }, [enabled, productId]);
}
