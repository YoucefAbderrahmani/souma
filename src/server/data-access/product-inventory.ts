import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { productsTable } from "@/server/db/schema";
import shopData from "@/components/Shop/shopData";
import { resolveStorefrontProductId } from "@/server/data-access/product-catalog";
import {
  clearDatabaseOutage,
  isNeonDataTransferQuotaError,
  noteDatabaseOutage,
} from "@/server/db-degraded";

const normalize = (value: string) => value.toLowerCase().trim().replace(/\s+/g, " ");

const LEGACY_STOREFRONT_IDS = new Set(shopData.map((s) => s.id));
const STATIC_FALLBACK_STOCK = 99;

const INVENTORY_READ_BREAKER_QUOTA_MS = 15 * 60 * 1000;
const INVENTORY_READ_BREAKER_OTHER_MS = 60 * 1000;

let inventoryReadBreakerOpenUntil = 0;

export type InventoryPurchaseItem = {
  productId: number;
  quantity: number;
};

type InventoryRow = {
  dbId: string;
  title: string;
  instock: number;
  offlineFallback?: boolean;
};

function normalizeStorefrontProductId(productId: number): number | null {
  if (!Number.isFinite(productId) || productId <= 0) return null;
  return Math.trunc(productId);
}

function mergePurchaseItems(items: InventoryPurchaseItem[]): InventoryPurchaseItem[] {
  const merged = new Map<number, number>();
  for (const item of items) {
    const productId = normalizeStorefrontProductId(item.productId);
    const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 0));
    if (!productId) continue;
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  return Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}

function mapDbRows(
  rows: { dbId: string; title: string; instock: number | null }[]
): InventoryRow[] {
  return rows.map((row) => ({
    dbId: row.dbId,
    title: row.title,
    instock: Math.max(0, Math.trunc(row.instock ?? 0)),
  }));
}

async function loadAllInventoryRows(): Promise<InventoryRow[]> {
  const rows = await db
    .select({
      dbId: productsTable.id,
      title: productsTable.title,
      instock: productsTable.instock,
    })
    .from(productsTable);
  return mapDbRows(rows);
}

function titlesForLegacyStorefrontIds(storefrontIds: number[]): string[] {
  const requested = new Set(
    storefrontIds.map((id) => Math.trunc(id)).filter((id) => Number.isFinite(id) && id > 0)
  );
  return Array.from(new Set(shopData.filter((s) => requested.has(s.id)).map((s) => s.title)));
}

function staticFallbackRowsForLegacy(storefrontIds: number[]): InventoryRow[] {
  const requested = new Set(
    storefrontIds.map((id) => Math.trunc(id)).filter((id) => Number.isFinite(id) && id > 0)
  );
  const rows: InventoryRow[] = [];
  for (const legacy of shopData) {
    if (!requested.has(legacy.id)) continue;
    const instock =
      typeof legacy.instock === "number" && Number.isFinite(legacy.instock) ?
        Math.max(0, Math.trunc(legacy.instock))
      : STATIC_FALLBACK_STOCK;
    rows.push({
      dbId: `__offline__:${legacy.id}`,
      title: legacy.title,
      instock,
      offlineFallback: true,
    });
  }
  return rows;
}

function skipInventoryDbByEnv(): boolean {
  const v = process.env.SKIP_CATALOG_INVENTORY_DB?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function isInventoryBreakerOpen(): boolean {
  return Date.now() < inventoryReadBreakerOpenUntil;
}

function tripInventoryBreaker(ms: number): void {
  inventoryReadBreakerOpenUntil = Math.max(inventoryReadBreakerOpenUntil, Date.now() + ms);
}

function clearInventoryBreaker(): void {
  inventoryReadBreakerOpenUntil = 0;
}

async function loadInventoryRowsForLegacyTitles(storefrontIds: number[]): Promise<InventoryRow[]> {
  const titles = titlesForLegacyStorefrontIds(storefrontIds);
  if (titles.length === 0) return [];
  const rows = await db
    .select({
      dbId: productsTable.id,
      title: productsTable.title,
      instock: productsTable.instock,
    })
    .from(productsTable)
    .where(inArray(productsTable.title, titles));
  return mapDbRows(rows);
}

async function loadInventoryRowsForStorefrontLookup(
  storefrontIds: number[],
  options?: { bypassInventoryReadBreaker?: boolean }
): Promise<InventoryRow[]> {
  const unique = Array.from(
    new Set(
      storefrontIds.map((id) => Math.trunc(id)).filter((id) => Number.isFinite(id) && id > 0)
    )
  );
  if (unique.length === 0) return [];

  const needsFullTable = unique.some((id) => !LEGACY_STOREFRONT_IDS.has(id));
  const legacyOnly = !needsFullTable;
  const honorBreaker = options?.bypassInventoryReadBreaker !== true;

  if (skipInventoryDbByEnv()) {
    if (legacyOnly) return staticFallbackRowsForLegacy(unique);
    return [];
  }

  if (honorBreaker && legacyOnly && isInventoryBreakerOpen()) {
    return staticFallbackRowsForLegacy(unique);
  }

  try {
    let rows: InventoryRow[];
    if (needsFullTable) {
      rows = await loadAllInventoryRows();
    } else {
      rows = await loadInventoryRowsForLegacyTitles(unique);
    }
    clearInventoryBreaker();
    clearDatabaseOutage();
    return rows;
  } catch (error) {
    const quota = isNeonDataTransferQuotaError(error);
    const ms = quota ? INVENTORY_READ_BREAKER_QUOTA_MS : INVENTORY_READ_BREAKER_OTHER_MS;
    tripInventoryBreaker(ms);
    noteDatabaseOutage(ms);
    if (legacyOnly) return staticFallbackRowsForLegacy(unique);
    return [];
  }
}

async function buildStorefrontInventoryIndexForIds(
  storefrontIds: number[],
  options?: { bypassInventoryReadBreaker?: boolean }
): Promise<Map<number, InventoryRow>> {
  const requested = new Set(
    storefrontIds.map((id) => Math.trunc(id)).filter((id) => Number.isFinite(id) && id > 0)
  );

  const rows = await loadInventoryRowsForStorefrontLookup(storefrontIds, options);
  const index = new Map<number, InventoryRow>();

  for (const row of rows) {
    const storefrontId = resolveStorefrontProductId(row.title, row.dbId);
    index.set(storefrontId, row);
  }

  for (const legacy of shopData) {
    if (!requested.has(legacy.id)) continue;
    if (index.has(legacy.id)) continue;
    const match = rows.find((row) => normalize(row.title) === normalize(legacy.title));
    if (match) {
      index.set(legacy.id, match);
    }
  }

  return index;
}

export async function getLiveInventoryByStorefrontIds(
  requestedIds: number[]
): Promise<Record<number, number>> {
  const uniqueIds = Array.from(
    new Set(
      requestedIds
        .map((id) => normalizeStorefrontProductId(id))
        .filter((id): id is number => id != null)
    )
  );
  if (uniqueIds.length === 0) return {};

  const index = await buildStorefrontInventoryIndexForIds(uniqueIds);
  const inventory: Record<number, number> = {};
  for (const productId of uniqueIds) {
    const row = index.get(productId);
    if (row) {
      inventory[productId] = row.instock;
    }
  }
  return inventory;
}

export async function validateInventoryForPurchase(
  items: InventoryPurchaseItem[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const merged = mergePurchaseItems(items);
  if (merged.length === 0) {
    return { ok: false, error: "No purchasable items were provided." };
  }

  const index = await buildStorefrontInventoryIndexForIds(merged.map((item) => item.productId), {
    bypassInventoryReadBreaker: true,
  });
  for (const item of merged) {
    const row = index.get(item.productId);
    if (!row) {
      return { ok: false, error: "One or more products are not available for live inventory checkout." };
    }
    if (row.offlineFallback) {
      return {
        ok: false,
        error: "Live inventory is temporarily unavailable. Please try again in a few minutes.",
      };
    }
    if (row.instock < item.quantity) {
      return {
        ok: false,
        error: `Only ${row.instock} unit${row.instock === 1 ? "" : "s"} remain for ${row.title}.`,
      };
    }
  }

  return { ok: true };
}

export async function applyPurchaseInventory(
  items: InventoryPurchaseItem[]
): Promise<{ ok: true; inventory: Record<number, number> } | { ok: false; error: string }> {
  const merged = mergePurchaseItems(items);
  if (merged.length === 0) {
    return { ok: false, error: "No purchasable items were provided." };
  }

  const validation = await validateInventoryForPurchase(merged);
  if (validation.ok === false) {
    return { ok: false, error: validation.error };
  }

  const index = await buildStorefrontInventoryIndexForIds(merged.map((item) => item.productId), {
    bypassInventoryReadBreaker: true,
  });
  const updatedInventory: Record<number, number> = {};

  try {
    await db.transaction(async (tx) => {
      for (const item of merged) {
        const row = index.get(item.productId);
        if (!row) {
          throw new Error("One or more products are not available for live inventory checkout.");
        }

        const [updated] = await tx
          .update(productsTable)
          .set({ instock: sql`${productsTable.instock} - ${item.quantity}` })
          .where(and(eq(productsTable.id, row.dbId), gte(productsTable.instock, item.quantity)))
          .returning({ instock: productsTable.instock });

        if (!updated) {
          throw new Error(`Only ${row.instock} unit${row.instock === 1 ? "" : "s"} remain for ${row.title}.`);
        }

        updatedInventory[item.productId] = Math.max(0, Math.trunc(updated.instock));
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update inventory.";
    return { ok: false, error: message };
  }

  const remaining = await getLiveInventoryByStorefrontIds(merged.map((item) => item.productId));
  return { ok: true, inventory: { ...remaining, ...updatedInventory } };
}

export async function getLiveInventoryForStorefrontProduct(
  productId: number
): Promise<number | null> {
  const inventory = await getLiveInventoryByStorefrontIds([productId]);
  return inventory[productId] ?? null;
}
