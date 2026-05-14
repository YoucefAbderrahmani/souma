import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { productsTable } from "@/server/db/schema";
import shopData from "@/components/Shop/shopData";
import { getStorefrontInventoryAliasIds } from "@/server/data-access/product-catalog";
import {
  clearDatabaseOutage,
  isNeonDataTransferQuotaError,
  noteDatabaseOutage,
} from "@/server/db-degraded";

const normalize = (value: string) => value.toLowerCase().trim().replace(/\s+/g, " ");

const LEGACY_STOREFRONT_IDS = new Set(shopData.map((s) => s.id));
const STATIC_FALLBACK_STOCK = 99;

/** Deterministic pseudo-random stock in [min, max] from a string seed (stable per product title). */
function syntheticStockFromSeed(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const span = Math.max(1, max - min + 1);
  return min + (h % span);
}

const INVENTORY_READ_BREAKER_QUOTA_MS = 15 * 60 * 1000;
const INVENTORY_READ_BREAKER_OTHER_MS = 60 * 1000;

let inventoryReadBreakerOpenUntil = 0;

export type InventoryPurchaseItem = {
  productId: number;
  quantity: number;
  /** When present, used to resolve the row if `productId` no longer matches (e.g. legacy id vs renamed DB title). */
  title?: string;
};

type InventoryRow = {
  dbId: string;
  title: string;
  instock: number;
  /** DB read failed; do not treat as live checkout. */
  offlineFallback?: boolean;
  /** `SKIP_CATALOG_INVENTORY_DB`: allow checkout without persisting stock changes. */
  skipDbSynthetic?: boolean;
};

function normalizeStorefrontProductId(productId: number): number | null {
  if (!Number.isFinite(productId) || productId <= 0) return null;
  return Math.trunc(productId);
}

function mergePurchaseItems(items: InventoryPurchaseItem[]): InventoryPurchaseItem[] {
  const merged = new Map<number, { quantity: number; title?: string }>();
  for (const item of items) {
    const productId = normalizeStorefrontProductId(item.productId);
    const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 0));
    if (!productId) continue;
    const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : undefined;
    const prev = merged.get(productId);
    if (!prev) {
      merged.set(productId, { quantity, title });
    } else {
      merged.set(productId, {
        quantity: prev.quantity + quantity,
        title: prev.title ?? title,
      });
    }
  }
  return Array.from(merged.entries()).map(([productId, v]) => ({
    productId,
    quantity: v.quantity,
    ...(v.title ? { title: v.title } : {}),
  }));
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

function staticFallbackRowsForLegacy(
  storefrontIds: number[],
  source: "skip_db" | "breaker"
): InventoryRow[] {
  const requested = new Set(
    storefrontIds.map((id) => Math.trunc(id)).filter((id) => Number.isFinite(id) && id > 0)
  );
  const rows: InventoryRow[] = [];
  for (const legacy of shopData) {
    if (!requested.has(legacy.id)) continue;
    const fromStatic =
      typeof legacy.instock === "number" && Number.isFinite(legacy.instock) ?
        Math.max(0, Math.trunc(legacy.instock))
      : null;
    const instock =
      source === "skip_db" ?
        (fromStatic ?? syntheticStockFromSeed(legacy.title, 35, 220))
      : (fromStatic ?? STATIC_FALLBACK_STOCK);
    rows.push({
      dbId: `__offline__:${legacy.id}`,
      title: legacy.title,
      instock,
      offlineFallback: source === "breaker",
      skipDbSynthetic: source === "skip_db",
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

  const needsFullTable =
    options?.bypassInventoryReadBreaker === true ||
    unique.some((id) => !LEGACY_STOREFRONT_IDS.has(id));
  const legacyOnly = !needsFullTable;
  const honorBreaker = options?.bypassInventoryReadBreaker !== true;

  if (skipInventoryDbByEnv()) {
    if (legacyOnly) return staticFallbackRowsForLegacy(unique, "skip_db");
    return [];
  }

  if (honorBreaker && legacyOnly && isInventoryBreakerOpen()) {
    return staticFallbackRowsForLegacy(unique, "breaker");
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
    if (legacyOnly) return staticFallbackRowsForLegacy(unique, "breaker");
    return [];
  }
}

/** Last-resort row for static catalog ids when the DB has no matching row (empty DB, drift, etc.). */
function legacySyntheticInventoryRow(productId: number, cartTitle?: string): InventoryRow | undefined {
  if (!LEGACY_STOREFRONT_IDS.has(productId)) return undefined;
  const legacy = shopData.find((s) => s.id === productId);
  if (!legacy) return undefined;
  const trimmed = cartTitle?.trim();
  if (trimmed && normalize(trimmed) !== normalize(legacy.title)) return undefined;
  const fromStatic =
    typeof legacy.instock === "number" && Number.isFinite(legacy.instock) ?
      Math.max(0, Math.trunc(legacy.instock))
    : null;
  return {
    dbId: `__synthetic_legacy__:${legacy.id}`,
    title: legacy.title,
    instock: fromStatic ?? syntheticStockFromSeed(legacy.title, 35, 220),
    skipDbSynthetic: true,
  };
}

function resolveInventoryRowForItem(
  item: InventoryPurchaseItem,
  index: Map<number, InventoryRow>,
  rows: InventoryRow[]
): InventoryRow | undefined {
  const fromId = index.get(item.productId);
  if (fromId) return fromId;
  const rawTitle = item.title?.trim();
  if (rawTitle) {
    const key = normalize(rawTitle);
    const fromTitle = rows.find((row) => normalize(row.title) === key);
    if (fromTitle) return fromTitle;
  }
  return legacySyntheticInventoryRow(item.productId, item.title);
}

async function buildStorefrontInventoryLookup(
  storefrontIds: number[],
  options?: { bypassInventoryReadBreaker?: boolean }
): Promise<{ index: Map<number, InventoryRow>; rows: InventoryRow[] }> {
  const requested = new Set(
    storefrontIds.map((id) => Math.trunc(id)).filter((id) => Number.isFinite(id) && id > 0)
  );

  const rows = await loadInventoryRowsForStorefrontLookup(storefrontIds, options);
  const index = new Map<number, InventoryRow>();

  for (const row of rows) {
    for (const alias of getStorefrontInventoryAliasIds(row.title, row.dbId)) {
      index.set(alias, row);
    }
  }

  for (const legacy of shopData) {
    if (!requested.has(legacy.id)) continue;
    if (index.has(legacy.id)) continue;
    const match = rows.find((row) => normalize(row.title) === normalize(legacy.title));
    if (match) {
      index.set(legacy.id, match);
    }
  }

  return { index, rows };
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

  const { index } = await buildStorefrontInventoryLookup(uniqueIds);
  const inventory: Record<number, number> = {};
  for (const productId of uniqueIds) {
    let row = index.get(productId);
    if (!row) {
      const syn = legacySyntheticInventoryRow(productId);
      if (syn) row = syn;
    }
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

  const { index, rows } = await buildStorefrontInventoryLookup(merged.map((item) => item.productId), {
    bypassInventoryReadBreaker: true,
  });
  for (const item of merged) {
    const row = resolveInventoryRowForItem(item, index, rows);
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

  const { index, rows } = await buildStorefrontInventoryLookup(merged.map((item) => item.productId), {
    bypassInventoryReadBreaker: true,
  });
  const updatedInventory: Record<number, number> = {};

  try {
    await db.transaction(async (tx) => {
      for (const item of merged) {
        const row = resolveInventoryRowForItem(item, index, rows);
        if (!row) {
          throw new Error("One or more products are not available for live inventory checkout.");
        }

        if (row.skipDbSynthetic) {
          updatedInventory[item.productId] = Math.max(0, row.instock - item.quantity);
          continue;
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
