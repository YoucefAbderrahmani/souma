"use client";

import {
  clearFunnelChargilyCheckoutSent,
  clearFunnelCheckoutPageSent,
} from "@/lib/funnel-checkout-session";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_POLL_MS = 15_000;
const PENDING_PURCHASE_STORAGE_KEY = "vitrina_pending_inventory_purchase";
const PENDING_PURCHASE_BACKUP_KEY = "vitrina_pending_inventory_purchase_backup";
const CHARGILY_PAYMENT_FLOW_ACTIVE_KEY = "vitrina_chargily_payment_flow_active";
const CHARGILY_PAYMENT_SNAPSHOT_KEY = "vitrina_chargily_payment_snapshot";
const CHARGILY_PAYMENT_SNAPSHOT_BACKUP_KEY = "vitrina_chargily_payment_snapshot_backup";
const FUNNEL_ORDER_COMPLETE_RECORDED_KEY = "vitrina_funnel_order_complete_recorded";

export type ChargilyPaymentSnapshot = {
  total_dzd: number;
  line_items: number;
  items_qty_total: number;
};

/** Dev only: set localStorage `vitrina:debugForceInventoryZero` to `"1"` so `/api/catalog/inventory` returns 0 (out-of-stock UI). */
export const DEBUG_FORCE_INVENTORY_ZERO_STORAGE_KEY = "vitrina:debugForceInventoryZero";

type InventoryResponse = {
  inventory?: Record<string, number>;
};

export function saveChargilyPaymentSnapshot(snapshot: ChargilyPaymentSnapshot): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(snapshot);
  try {
    window.sessionStorage.setItem(CHARGILY_PAYMENT_SNAPSHOT_KEY, serialized);
    window.localStorage.setItem(CHARGILY_PAYMENT_SNAPSHOT_BACKUP_KEY, serialized);
  } catch {
    /* ignore */
  }
}

export function readChargilyPaymentSnapshot(): ChargilyPaymentSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.sessionStorage.getItem(CHARGILY_PAYMENT_SNAPSHOT_KEY) ??
      window.localStorage.getItem(CHARGILY_PAYMENT_SNAPSHOT_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChargilyPaymentSnapshot;
    if (!Number.isFinite(parsed.total_dzd)) return null;
    return {
      total_dzd: Math.max(0, Number(parsed.total_dzd)),
      line_items: Math.max(1, Math.trunc(Number(parsed.line_items) || 1)),
      items_qty_total: Math.max(0, Math.trunc(Number(parsed.items_qty_total) || 0)),
    };
  } catch {
    return null;
  }
}

function clearChargilyPaymentSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHARGILY_PAYMENT_SNAPSHOT_KEY);
    window.localStorage.removeItem(CHARGILY_PAYMENT_SNAPSHOT_BACKUP_KEY);
  } catch {
    /* ignore */
  }
}

export function savePendingInventoryPurchase(
  items: Array<{ id: number; quantity: number; title?: string }>,
  snapshot?: ChargilyPaymentSnapshot
) {
  if (typeof window === "undefined") return;
  const payload = items
    .filter((item) => Number.isFinite(item.id) && item.id > 0)
    .map((item) => ({
      productId: Math.trunc(item.id),
      quantity: Math.max(1, Math.trunc(item.quantity)),
      ...(typeof item.title === "string" && item.title.trim() ? { title: item.title.trim() } : {}),
    }));
  if (payload.length === 0) return;
  const serialized = JSON.stringify(payload);
  window.sessionStorage.setItem(PENDING_PURCHASE_STORAGE_KEY, serialized);
  try {
    window.localStorage.setItem(PENDING_PURCHASE_BACKUP_KEY, serialized);
    window.sessionStorage.setItem(CHARGILY_PAYMENT_FLOW_ACTIVE_KEY, "1");
    window.sessionStorage.removeItem(FUNNEL_ORDER_COMPLETE_RECORDED_KEY);
    clearFunnelChargilyCheckoutSent();
    if (snapshot) saveChargilyPaymentSnapshot(snapshot);
  } catch {
    /* ignore */
  }
}

/** Restore pending cart from localStorage when returning from Chargily in another tab. */
export function restorePendingPurchaseFromBackup(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(PENDING_PURCHASE_STORAGE_KEY) != null) return true;
    const backup = window.localStorage.getItem(PENDING_PURCHASE_BACKUP_KEY);
    if (!backup) return false;
    window.sessionStorage.setItem(PENDING_PURCHASE_STORAGE_KEY, backup);
    return true;
  } catch {
    return false;
  }
}

export function isChargilyPaymentFlowActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(CHARGILY_PAYMENT_FLOW_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

function clearChargilyPaymentFlowMarkers(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHARGILY_PAYMENT_FLOW_ACTIVE_KEY);
    window.sessionStorage.removeItem(PENDING_PURCHASE_STORAGE_KEY);
    window.localStorage.removeItem(PENDING_PURCHASE_BACKUP_KEY);
    clearChargilyPaymentSnapshot();
  } catch {
    /* ignore */
  }
}

/** True after the user clicked Pay and Chargily checkout was started (pending cart snapshot). */
export function hasChargilyPaymentPending(): boolean {
  if (typeof window === "undefined") return false;
  restorePendingPurchaseFromBackup();
  try {
    return window.sessionStorage.getItem(PENDING_PURCHASE_STORAGE_KEY) != null;
  } catch {
    return false;
  }
}

export function isFunnelOrderCompleteRecorded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(FUNNEL_ORDER_COMPLETE_RECORDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFunnelOrderCompleteRecorded(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FUNNEL_ORDER_COMPLETE_RECORDED_KEY, "1");
    clearChargilyPaymentFlowMarkers();
    clearFunnelCheckoutPageSent();
    clearFunnelChargilyCheckoutSent();
  } catch {
    /* ignore */
  }
}

export function readPendingPurchaseLineCount(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(PENDING_PURCHASE_STORAGE_KEY);
  if (!raw) return 0;
  try {
    const items = JSON.parse(raw) as Array<{ productId?: unknown }>;
    return Array.isArray(items) ? items.length : 0;
  } catch {
    return 0;
  }
}

export async function commitPendingInventoryPurchase(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const raw = window.sessionStorage.getItem(PENDING_PURCHASE_STORAGE_KEY);
  if (!raw) return false;

  let items: Array<{ productId: number; quantity: number; title?: string }>;
  try {
    items = JSON.parse(raw) as Array<{ productId: number; quantity: number; title?: string }>;
  } catch {
    window.sessionStorage.removeItem(PENDING_PURCHASE_STORAGE_KEY);
    return false;
  }

  const response = await fetch("/api/catalog/inventory/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ items }),
  });

  if (response.ok) {
    clearChargilyPaymentFlowMarkers();
    return true;
  }
  return false;
}

export function useLiveProductInventory(
  productId: number | null | undefined,
  initialInstock?: number | null,
  options?: { enabled?: boolean; pollMs?: number }
) {
  const enabled = options?.enabled !== false;
  const pollMs = options?.pollMs ?? DEFAULT_POLL_MS;
  const [instock, setInstock] = useState<number | null>(
    typeof initialInstock === "number" && Number.isFinite(initialInstock) ?
      Math.max(0, Math.trunc(initialInstock))
    : null
  );

  useEffect(() => {
    if (typeof initialInstock === "number" && Number.isFinite(initialInstock)) {
      setInstock(Math.max(0, Math.trunc(initialInstock)));
    } else {
      setInstock(null);
    }
  }, [initialInstock, productId]);

  const refresh = useCallback(async () => {
    if (!productId || productId <= 0) return;
    try {
      const params = new URLSearchParams();
      params.set("ids", String(Math.trunc(productId)));
      if (
        process.env.NODE_ENV === "development" &&
        typeof window !== "undefined" &&
        window.localStorage.getItem(DEBUG_FORCE_INVENTORY_ZERO_STORAGE_KEY) === "1"
      ) {
        params.set("forceInventoryZero", "1");
      }
      const response = await fetch(`/api/catalog/inventory?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const body = (await response.json()) as InventoryResponse;
      const next = body.inventory?.[String(productId)] ?? body.inventory?.[productId];
      if (typeof next === "number" && Number.isFinite(next)) {
        setInstock(Math.max(0, Math.trunc(next)));
      }
    } catch {
      /* ignore transient network errors */
    }
  }, [productId]);

  useEffect(() => {
    if (!enabled || !productId || productId <= 0) return;
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, pollMs);
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, pollMs, productId, refresh]);

  return { instock, refresh };
}
