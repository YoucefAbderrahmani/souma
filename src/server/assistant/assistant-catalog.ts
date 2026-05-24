import {
  getDisplaySpecifications,
  getProductSizeOptions,
  isStructuredProductContent,
  parseProductContent,
} from "@/lib/product-content";
import { getCatalogProducts } from "@/server/data-access/product-catalog";
import type { Product } from "@/types/product";

const CATALOG_TTL_MS = 1000 * 60 * 2;

let cachedProducts: Product[] | null = null;
let cacheExpiresAt = 0;

/** Plain-text search blob for LLM + token fallback (includes structured catalog fields). */
export function plainProductDescriptionForAssistant(product: Product): string {
  const raw = product.description ?? "";
  if (!isStructuredProductContent(raw)) {
    return raw.trim().slice(0, 900);
  }

  const parsed = parseProductContent(raw);
  const specs = getDisplaySpecifications(parsed);
  const sizes = getProductSizeOptions(parsed);
  const parts: string[] = [];

  if (parsed.description?.trim()) parts.push(parsed.description.trim());
  if (parsed.colors.length > 0) {
    parts.push(`Colors: ${parsed.colors.map((c) => c.name).join(", ")}`);
  }
  if (sizes.length > 0) {
    parts.push(`Sizes: ${sizes.map((s) => s.label).join(", ")}`);
  }
  for (const spec of specs) {
    parts.push(`${spec.name}: ${spec.options.map((o) => o.label).join(", ")}`);
  }
  for (const row of parsed.additionalInfo) {
    if (row.key.trim() && row.value.trim()) parts.push(`${row.key}: ${row.value}`);
  }

  return parts.join(". ").slice(0, 900);
}

/**
 * Live storefront catalog: PostgreSQL `products` (+ categories), merged with static
 * `shopData` seed (DB wins on duplicate titles). Refreshed every few minutes.
 */
export async function getAssistantCatalogProducts(): Promise<Product[]> {
  const now = Date.now();
  if (cachedProducts && cacheExpiresAt > now) {
    return cachedProducts;
  }

  const products = await getCatalogProducts();
  cachedProducts = products;
  cacheExpiresAt = now + CATALOG_TTL_MS;
  return products;
}

export function invalidateAssistantCatalogCache() {
  cachedProducts = null;
  cacheExpiresAt = 0;
}
