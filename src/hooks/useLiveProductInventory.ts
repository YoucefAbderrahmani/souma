"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_POLL_MS = 15_000;
const PENDING_PURCHASE_STORAGE_KEY = "vitrina_pending_inventory_purchase";

/** Dev only: set localStorage `vitrina:debugForceInventoryZero` to `"1"` so `/api/catalog/inventory` returns 0 (out-of-stock UI). */
export const DEBUG_FORCE_INVENTORY_ZERO_STORAGE_KEY = "vitrina:debugForceInventoryZero";

type InventoryResponse = {
  inventory?: Record<string, number>;
};

export function savePendingInventoryPurchase(
  items: Array<{ id: number; quantity: number }>
) {
  if (typeof window === "undefined") return;
  const payload = items
    .filter((item) => Number.isFinite(item.id) && item.id > 0)
    .map((item) => ({
      productId: Math.trunc(item.id),
      quantity: Math.max(1, Math.trunc(item.quantity)),
    }));
  if (payload.length === 0) return;
  window.sessionStorage.setItem(PENDING_PURCHASE_STORAGE_KEY, JSON.stringify(payload));
}

export async function commitPendingInventoryPurchase(): Promise<void> {
  if (typeof window === "undefined") return;
  const raw = window.sessionStorage.getItem(PENDING_PURCHASE_STORAGE_KEY);
  if (!raw) return;

  let items: Array<{ productId: number; quantity: number }>;
  try {
    items = JSON.parse(raw) as Array<{ productId: number; quantity: number }>;
  } catch {
    window.sessionStorage.removeItem(PENDING_PURCHASE_STORAGE_KEY);
    return;
  }

  const response = await fetch("/api/catalog/inventory/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ items }),
  });

  if (response.ok) {
    window.sessionStorage.removeItem(PENDING_PURCHASE_STORAGE_KEY);
  }
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
