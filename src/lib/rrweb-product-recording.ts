"use client";

import type { eventWithTime } from "@rrweb/types";
import {
  getOrCreateBrowserSequenceSessionId,
  SEQUENCE_SESSION_HEADER,
} from "@/lib/browser-sequence-session";
import { publicApiUrl } from "@/lib/public-api-url";

const FLUSH_MS = 20_000;
const FLUSH_EVENT_COUNT = 80;

export async function flushRrwebProductEvents(productId: number, events: eventWithTime[]) {
  if (events.length === 0 || typeof window === "undefined") return;

  const sessionKey = getOrCreateBrowserSequenceSessionId();
  const payload = JSON.stringify({
    sessionKey,
    productId,
    events,
  });

  const url = publicApiUrl("/api/product-analytics/rrweb");

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    const sent = navigator.sendBeacon(url, blob);
    if (sent) return;
  }

  await fetch(url, {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      [SEQUENCE_SESSION_HEADER]: sessionKey,
    },
    body: payload,
    keepalive: true,
  });
}

export { FLUSH_MS, FLUSH_EVENT_COUNT };
