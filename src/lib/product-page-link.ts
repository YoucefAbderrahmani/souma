export function productDetailsHref(productId: string | number) {
  return `/shop-details?productId=${encodeURIComponent(String(productId))}`;
}

export function productHeatmapPreviewHref(productId: string | number) {
  const params = new URLSearchParams({
    productId: String(productId),
    heatmapPreview: "1",
  });
  return `/shop-details?${params.toString()}`;
}

export function parseRequestedProductId(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
}

export function resolveTrackingProductId(
  requestedProductId: string | null | undefined,
  fallbackProductId: number
): number {
  const fromUrl = parseRequestedProductId(requestedProductId);
  if (fromUrl) return fromUrl;
  if (Number.isFinite(fallbackProductId) && fallbackProductId > 0) return Math.trunc(fallbackProductId);
  return 0;
}
