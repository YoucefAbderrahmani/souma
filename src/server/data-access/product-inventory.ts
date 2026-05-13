import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { productsTable } from "@/server/db/schema";
import shopData from "@/components/Shop/shopData";
import { resolveStorefrontProductId } from "@/server/data-access/product-catalog";

const normalize = (value: string) => value.toLowerCase().trim().replace(/\s+/g, " ");

export type InventoryPurchaseItem = {
  productId: number;
  quantity: number;
};

type InventoryRow = {
  dbId: string;
  title: string;
  instock: number;
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

async function loadInventoryRows(): Promise<InventoryRow[]> {
  const rows = await db
    .select({
      dbId: productsTable.id,
      title: productsTable.title,
      instock: productsTable.instock,
    })
    .from(productsTable);

  return rows.map((row) => ({
    dbId: row.dbId,
    title: row.title,
    instock: Math.max(0, Math.trunc(row.instock)),
  }));
}

async function buildStorefrontInventoryIndex(): Promise<Map<number, InventoryRow>> {
  const rows = await loadInventoryRows();
  const index = new Map<number, InventoryRow>();

  for (const row of rows) {
    const storefrontId = resolveStorefrontProductId(row.title, row.dbId);
    index.set(storefrontId, row);
  }

  for (const legacy of shopData) {
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

  const index = await buildStorefrontInventoryIndex();
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

  const index = await buildStorefrontInventoryIndex();
  for (const item of merged) {
    const row = index.get(item.productId);
    if (!row) {
      return { ok: false, error: "One or more products are not available for live inventory checkout." };
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

  const index = await buildStorefrontInventoryIndex();
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
