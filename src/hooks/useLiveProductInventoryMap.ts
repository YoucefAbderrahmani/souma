"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEBUG_FORCE_INVENTORY_ZERO_STORAGE_KEY } from "@/hooks/useLiveProductInventory";

const DEFAULT_POLL_MS = 15_000;

type InventoryResponse = {
  inventory?: Record<string, number>;
};

function normalizeIds(productIds: number[]): number[] {
  return Array.from(
    new Set(
      productIds
        .map((id) => Math.trunc(Number(id)))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  ).sort((a, b) => a - b);
}

export function useLiveProductInventoryMap(
  productIds: number[],
  options?: { enabled?: boolean; pollMs?: number }
) {
  const enabled = options?.enabled !== false;
  const pollMs = options?.pollMs ?? DEFAULT_POLL_MS;
  const ids = useMemo(() => normalizeIds(productIds), [productIds]);
  const idsKey = ids.join(",");

  const [inventory, setInventory] = useState<Record<number, number>>({});

  const refresh = useCallback(async () => {
    if (ids.length === 0) {
      setInventory({});
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set("ids", ids.join(","));
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
      const next: Record<number, number> = {};
      for (const id of ids) {
        const raw = body.inventory?.[String(id)] ?? body.inventory?.[id];
        if (typeof raw === "number" && Number.isFinite(raw)) {
          next[id] = Math.max(0, Math.trunc(raw));
        }
      }
      setInventory(next);
    } catch {
      /* ignore transient network errors */
    }
  }, [ids]);

  useEffect(() => {
    if (!enabled || ids.length === 0) return;
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
  }, [enabled, idsKey, pollMs, refresh]);

  return { inventory, refresh };
}
