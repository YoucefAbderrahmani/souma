/** Admin creates products with slug `{base}-{Date.now()}` — use that for “newest first” ordering. */
export function catalogAddedAtFromSlug(slug: string): number {
  const match = slug.trim().match(/-(\d{10,13})$/);
  if (!match) return 0;
  const ms = Number(match[1]);
  return Number.isFinite(ms) ? ms : 0;
}

/** Effective storefront sort position (boost timestamp wins over listing date). */
export function catalogStorefrontSortKey(product: {
  catalogAddedAt?: number;
  catalogBoostAt?: number;
}): number {
  return Math.max(product.catalogAddedAt ?? 0, product.catalogBoostAt ?? 0);
}

export function sortProductsForStorefront<T extends { catalogAddedAt?: number; catalogBoostAt?: number }>(
  products: T[]
): T[] {
  return [...products].sort((a, b) => catalogStorefrontSortKey(b) - catalogStorefrontSortKey(a));
}

export function sortProductsNewestFirst<T extends { catalogAddedAt?: number; catalogBoostAt?: number }>(
  products: T[]
): T[] {
  return sortProductsForStorefront(products);
}
