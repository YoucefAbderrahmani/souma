import { cache } from "react";
import { getCatalogProductByRequestedId } from "@/server/data-access/product-catalog";
import { getLiveInventoryForStorefrontProduct } from "@/server/data-access/product-inventory";
import type { Product } from "@/types/product";

/** One round-trip pair per PDP request — shared by `generateMetadata` and the page. */
export const loadCatalogProductForPdp = cache(async (requestedId: number): Promise<Product | null> => {
  const product = await getCatalogProductByRequestedId(requestedId);
  if (!product) return null;

  const liveInstock = await getLiveInventoryForStorefrontProduct(requestedId);
  return liveInstock != null ? { ...product, instock: liveInstock } : product;
});
