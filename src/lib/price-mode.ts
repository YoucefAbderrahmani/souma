import { Product } from "@/types/product";

export const hasSoumaPrice = (product: Product) =>
  typeof product.jomlaPrice === "number";

export const getVisibleProductsForMode = (
  products: Product[],
  mode: "detail" | "jomla"
) => (mode === "jomla" ? products.filter(hasSoumaPrice) : products);
