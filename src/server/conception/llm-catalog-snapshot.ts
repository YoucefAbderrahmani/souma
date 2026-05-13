import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { categoryTable, productsTable } from "@/server/db/schema";

/** Compact rows for Conception LLM: real catalogue from DB (grounding, not invented). */
export type ConceptionCatalogProductRow = {
  id: string;
  title: string;
  category: string;
  manufacturer: string;
  listPriceDzd: number;
  promoPriceDzd: number | null;
  instock: number;
};

/**
 * Snapshot of active products for LLM analysis. Prioritises low-stock items so the model
 * can surface inventory and merchandising actions tied to real SKUs.
 */
export async function buildCatalogSnapshotForConceptionLlm(limit = 28): Promise<ConceptionCatalogProductRow[]> {
  const capped = Math.min(50, Math.max(8, limit));
  const rows = await db
    .select({
      id: productsTable.id,
      title: productsTable.title,
      categoryName: categoryTable.name,
      manufacturer: productsTable.manufacturer,
      price: productsTable.price,
      jomlaPrice: productsTable.jomlaPrice,
      instock: productsTable.instock,
    })
    .from(productsTable)
    .innerJoin(categoryTable, eq(productsTable.categoryId, categoryTable.id))
    .orderBy(asc(productsTable.instock), asc(productsTable.title))
    .limit(capped);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.categoryName,
    manufacturer: r.manufacturer,
    listPriceDzd: r.price,
    promoPriceDzd: r.jomlaPrice,
    instock: r.instock,
  }));
}
