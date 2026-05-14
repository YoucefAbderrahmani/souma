import { revalidatePath } from "next/cache";

const STOREFRONT_PATHS = ["/", "/shop-with-sidebar", "/shop-without-sidebar", "/shop-details"] as const;

/** Invalidate cached RSC for catalog-driven storefront routes (home, shop, PDP shell, categories). */
export function revalidateStorefrontCatalogPaths(): void {
  for (const path of STOREFRONT_PATHS) {
    revalidatePath(path);
    revalidatePath(path, "page");
  }
  revalidatePath("/category", "layout");
}
