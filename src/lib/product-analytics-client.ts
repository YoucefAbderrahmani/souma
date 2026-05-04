"use client";

import {
  getOrCreateBrowserSequenceSessionId,
  SEQUENCE_SESSION_HEADER,
} from "@/lib/browser-sequence-session";
import { publicApiUrl } from "@/lib/public-api-url";
import { isPaEventName, PA_EVENT_NAMES } from "@/lib/pa-whitelist";

const API = () => publicApiUrl("/api/sales-analyst/events");
const FLUSH_MS = 1800;
const MAX_BATCH = 40;

type ProductCtx = {
  productId: number;
  productTitle: string;
};

type PageCtx = {
  pagePath: string;
  product?: ProductCtx | null;
};

let pageCtx: PageCtx = { pagePath: "/" };
let capturedReferrer: string | null = null;
let unloadHooked = false;

/** Remote-disabled `pa_*` names (from GET /api/product-analytics/tracking-config). Empty = all allowed. */
let clientDisabledPa: Set<string> | null = null;
let clientConfigLoadStarted = false;

let refetchInterval: number | null = null;

function scheduleTrackingConfigRefetch() {
  if (refetchInterval || typeof window === "undefined") return;
  refetchInterval = window.setInterval(() => {
    void refreshProductAnalyticsTrackingConfig();
  }, 90_000);
}

function applyEnabledMap(enabled: Record<string, boolean> | undefined) {
  if (!enabled || typeof enabled !== "object") {
    clientDisabledPa = new Set();
    return;
  }
  const disabled = new Set<string>();
  for (const name of PA_EVENT_NAMES) {
    if (enabled[name] === false) disabled.add(name);
  }
  clientDisabledPa = disabled;
  scheduleTrackingConfigRefetch();
}

function ensureTrackingConfigLoaded() {
  if (typeof window === "undefined" || clientConfigLoadStarted) return;
  clientConfigLoadStarted = true;
  void (async () => {
    try {
      const r = await fetch(publicApiUrl("/api/product-analytics/tracking-config"), {
        credentials: "omit",
        cache: "no-store",
      });
      const j = (await r.json()) as { enabled?: Record<string, boolean> };
      applyEnabledMap(j.enabled);
    } catch {
      clientDisabledPa = new Set();
    }
  })();
}

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
    void flushProductAnalyticsBeacon();
  });
}

export function setProductAnalyticsPageContext(next: PageCtx) {
  ensureUnloadHook();
  pageCtx = {
    pagePath: next.pagePath,
    product: next.product === undefined ? pageCtx.product : next.product ?? null,
  };
  ensureReferrerCaptured();
}

export function setProductAnalyticsProductContext(product: ProductCtx & { pagePath?: string }) {
  setProductAnalyticsPageContext({
    pagePath:
      product.pagePath ||
      (typeof window !== "undefined" ? window.location.pathname : "/"),
    product: { productId: product.productId, productTitle: product.productTitle },
  });
}

/** Queue a product analytics event (`pa_*` only). Unknown names are ignored. */
export function trackProductAnalytics(name: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const n = typeof name === "string" ? name.trim() : "";
  if (!n.startsWith("pa_") || !isPaEventName(n)) return;
  ensureTrackingConfigLoaded();
  if (clientDisabledPa?.has(n)) return;
  ensureUnloadHook();
  ensureReferrerCaptured();
  queue.push({ name: n, payload, clientTs: Date.now() });
  if (queue.length >= MAX_BATCH) {
    void flushProductAnalyticsNow();
    return;
  }
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushProductAnalyticsNow();
    }, FLUSH_MS);
  }
}

function filterQueuedByRemote(events: Queued[]): Queued[] {
  if (!clientDisabledPa || clientDisabledPa.size === 0) return events;
  return events.filter((e) => !clientDisabledPa!.has(e.name));
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

/** Refresh remote toggles (e.g. after admin changes). Next events respect the new map. */
export async function refreshProductAnalyticsTrackingConfig(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const r = await fetch(publicApiUrl("/api/product-analytics/tracking-config"), {
      credentials: "omit",
      cache: "no-store",
    });
    const j = (await r.json()) as { enabled?: Record<string, boolean> };
    applyEnabledMap(j.enabled);
  } catch {
    clientDisabledPa = new Set();
  }
}

export async function flushProductAnalyticsNow(): Promise<void> {
  if (flushing || queue.length === 0) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushing = true;
  const batch = queue.splice(0, queue.length);
  const toSend = filterQueuedByRemote(batch);
  if (toSend.length === 0) {
    flushing = false;
    return;
  }
  try {
    const sid = getOrCreateBrowserSequenceSessionId();
    if (!sid) return;
    await fetch(API(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SEQUENCE_SESSION_HEADER]: sid,
      },
      body: buildBody(toSend),
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  } finally {
    flushing = false;
  }
}

export function flushProductAnalyticsBeacon(): boolean {
  if (queue.length === 0) return true;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const batch = queue.splice(0, queue.length);
  const toSend = filterQueuedByRemote(batch);
  if (toSend.length === 0) return true;
  const sid = getOrCreateBrowserSequenceSessionId();
  if (!sid) return false;
  const body = buildBody(toSend);
  try {
    const ok = navigator.sendBeacon(API(), new Blob([body], { type: "application/json" }));
    if (!ok) {
      void fetch(API(), {
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
