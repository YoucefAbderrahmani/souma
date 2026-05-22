/** Admin creates products with slug `{base}-{Date.now()}` — use that for “newest first” ordering. */
export function catalogAddedAtFromSlug(slug: string): number {
  const match = slug.trim().match(/-(\d{10,13})$/);
  if (!match) return 0;
  const ms = Number(match[1]);
  return Number.isFinite(ms) ? ms : 0;
}

export function sortProductsNewestFirst<T extends { catalogAddedAt?: number }>(products: T[]): T[] {
  return [...products].sort(
    (a, b) => (b.catalogAddedAt ?? 0) - (a.catalogAddedAt ?? 0)
  );
}
