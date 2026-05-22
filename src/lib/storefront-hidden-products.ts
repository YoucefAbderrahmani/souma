import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { storefrontHiddenProductTable } from "@/server/db/schema";
import type { Product } from "@/types/product";

export function normalizeStorefrontProductTitle(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function getHiddenStorefrontTitleKeys(): Promise<Set<string>> {
  try {
    const rows = await db
      .select({ normalizedTitle: storefrontHiddenProductTable.normalizedTitle })
      .from(storefrontHiddenProductTable);
    return new Set(rows.map((r) => r.normalizedTitle));
  } catch {
    return new Set();
  }
}

export async function hideStorefrontProductByTitle(title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) return;
  const normalizedTitle = normalizeStorefrontProductTitle(trimmed);
  await db
    .insert(storefrontHiddenProductTable)
    .values({ normalizedTitle, title: trimmed })
    .onConflictDoUpdate({
      target: storefrontHiddenProductTable.normalizedTitle,
      set: { title: trimmed, hiddenAt: new Date() },
    });
}

export async function unhideStorefrontProductByTitle(title: string): Promise<void> {
  const normalizedTitle = normalizeStorefrontProductTitle(title);
  if (!normalizedTitle) return;
  await db
    .delete(storefrontHiddenProductTable)
    .where(eq(storefrontHiddenProductTable.normalizedTitle, normalizedTitle));
}

export function filterStorefrontHiddenProducts(
  products: Product[],
  hiddenTitles: Set<string>
): Product[] {
  if (hiddenTitles.size === 0) return products;
  return products.filter((p) => !hiddenTitles.has(normalizeStorefrontProductTitle(p.title)));
}
