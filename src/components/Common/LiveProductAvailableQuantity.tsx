"use client";

import { ProductAvailableQuantity } from "@/components/Common/ProductAvailableQuantity";
import { useLiveProductInventory } from "@/hooks/useLiveProductInventory";
import type { Product } from "@/types/product";

export function LiveProductAvailableQuantity({
  product,
  className,
  enabled = true,
  variant = "default",
}: {
  product: Pick<Product, "id" | "instock">;
  className?: string;
  enabled?: boolean;
  variant?: "default" | "compact";
}) {
  const { instock } = useLiveProductInventory(product.id, product.instock ?? null, { enabled });
  return (
    <ProductAvailableQuantity
      product={{ instock: instock ?? product.instock }}
      className={className}
      variant={variant}
    />
  );
}
