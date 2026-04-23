"use client";

import {
  getOrCreateBrowserSequenceSessionId,
  SEQUENCE_SESSION_HEADER,
} from "@/lib/browser-sequence-session";

const API = "/api/sales-analyst/events";
const FLUSH_MS = 1800;
const MAX_BATCH = 30;

type ProductCtx = {
  productId: number;
  productTitle: string;
};

type PageCtx = {
  pagePath: string;
  /** Omit to keep previous product context; pass `null` to clear (e.g. checkout). */
  product?: ProductCtx | null;
};

let pageCtx: PageCtx = { pagePath: "/" };
let capturedReferrer: string | null = null;
let unloadHooked = false;

type Queued = { name: string; payload?: Record<string, unknown>; clientTs: number };
const queue: Queued[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function ensureReferrerCaptured() {
  if (typeof document === "undefined") return;
  if (capturedReferrer === null) {
    capturedReferrer = document.referrer || "";
  }
}

function ensureUnloadHook() {
  if (unloadHooked || typeof window === "undefined") return;
  unloadHooked = true;
  window.addEventListener("pagehide", () => {
    void flushSalesMicroEventsBeacon();
  });
}

export function setSalesMicroPageContext(next: PageCtx) {
  ensureUnloadHook();
  pageCtx = {
    pagePath: next.pagePath,
    product: next.product === undefined ? pageCtx.product : next.product ?? null,
  };
  ensureReferrerCaptured();
}

export function setSalesMicroProductContext(product: ProductCtx & { pagePath?: string }) {
  setSalesMicroPageContext({
    pagePath:
      product.pagePath ||
      (typeof window !== "undefined" ? window.location.pathname : "/"),
    product: { productId: product.productId, productTitle: product.productTitle },
  });
}

export function trackSalesMicroEvent(name: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  ensureUnloadHook();
  ensureReferrerCaptured();
  queue.push({ name, payload, clientTs: Date.now() });
  if (queue.length >= MAX_BATCH) {
    void flushSalesMicroEventsNow();
    return;
  }
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushSalesMicroEventsNow();
    }, FLUSH_MS);
  }
}

function buildBody(events: Queued[]): string {
  const sid = getOrCreateBrowserSequenceSessionId();
  const pagePath =
    pageCtx.pagePath || (typeof window !== "undefined" ? window.location.pathname : "/");
  return JSON.stringify({
    sessionKey: sid,
    pagePath,
    referrer: capturedReferrer,
    productId: pageCtx.product?.productId,
    productTitle: pageCtx.product?.productTitle,
    events: events.map((e) => ({
      name: e.name,
      payload: e.payload,
      clientTs: e.clientTs,
    })),
  });
}

export async function flushSalesMicroEventsNow(): Promise<void> {
  if (flushing || queue.length === 0) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushing = true;
  const batch = queue.splice(0, queue.length);
  try {
    const sid = getOrCreateBrowserSequenceSessionId();
    if (!sid) return;
    await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SEQUENCE_SESSION_HEADER]: sid,
      },
      body: buildBody(batch),
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  } finally {
    flushing = false;
  }
}

export function flushSalesMicroEventsBeacon(): boolean {
  if (queue.length === 0) return true;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const batch = queue.splice(0, queue.length);
  const sid = getOrCreateBrowserSequenceSessionId();
  if (!sid) return false;
  const body = buildBody(batch);
  try {
    const ok = navigator.sendBeacon(API, new Blob([body], { type: "application/json" }));
    if (!ok) {
      void fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    }
    return ok;
  } catch {
    return false;
  }
}
