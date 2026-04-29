import { Product } from "@/types/product";

export const hasVitrinaPrice = (product: Product) =>
  typeof product.jomlaPrice === "number";

export const getVisibleProductsForMode = (
  products: Product[],
  mode: "detail" | "jomla"
) => (mode === "jomla" ? products.filter(hasVitrinaPrice) : products);
