"use client";

import {
  getOrCreateBrowserSequenceSessionId,
  SEQUENCE_SESSION_HEADER,
} from "@/lib/browser-sequence-session";

function post(path: string, body: object) {
  if (typeof window === "undefined") return;
  const sid = getOrCreateBrowserSequenceSessionId();
  if (!sid) return;
  fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [SEQUENCE_SESSION_HEADER]: sid,
    },
    body: JSON.stringify(body),
    credentials: "include",
    keepalive: true,
  }).catch(() => {});
}

/** User submitted the header search (query text). */
export function sequenceStartSearch(query: string) {
  const q = query.trim();
  if (!q) return;
  post("/api/sequence/start", { triggerType: "search", triggerLabel: q });
}

/** User opened a category listing page. */
export function sequenceStartCategory(slug: string) {
  const s = slug.trim();
  if (!s) return;
  post("/api/sequence/start", { triggerType: "category", triggerLabel: s });
}

/** User chose a product (opens product detail). */
export function sequenceStartProduct(title: string) {
  const t = title.trim();
  if (!t) return;
  post("/api/sequence/start", { triggerType: "product", triggerLabel: t });
}

/** Product detail page is showing (call once on mount). */
export function sequenceVisitProduct() {
  post("/api/sequence/visit-product", {});
}

/** Left /shop-details without completing checkout from product context. */
export function sequenceEndLeave() {
  post("/api/sequence/end", { reason: "leave" });
}

/** Try to close sequence during hard exits (refresh/tab close), fallback to fetch keepalive. */
export function sequenceEndLeaveOnPageExit() {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({ reason: "leave" });
    const ok = navigator.sendBeacon("/api/sequence/end", new Blob([payload], { type: "application/json" }));
    if (ok) return;
  } catch {
    // fallback below
  }
  sequenceEndLeave();
}

/** Checkout submitted (purchase completed flow). */
export function sequenceEndPurchase() {
  post("/api/sequence/end", { reason: "purchase" });
}
