"use client";

import type { ReactNode } from "react";
import { ProductAvailableQuantity, productAvailableQuantity } from "@/components/Common/ProductAvailableQuantity";
import { useLiveProductInventory } from "@/hooks/useLiveProductInventory";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

/** One row: stars → trailing (e.g. review count `(15)`) → compact stock (`50 in stock`). */
export function ProductCardStarsRowWithStock({
  product,
  stars,
  trailing,
  className,
}: {
  product: Pick<Product, "id" | "instock">;
  stars: ReactNode;
  trailing: ReactNode;
  className?: string;
}) {
  const { instock: liveInstock } = useLiveProductInventory(product.id, product.instock ?? null);
  const instock = liveInstock ?? product.instock;
  const hasStock = productAvailableQuantity({ instock }) !== null;

  return (
    <div className={cn("mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 sm:gap-x-2.5", className)}>
      {stars}
      {trailing}
      {hasStock ?
        <ProductAvailableQuantity
          product={{ instock }}
          variant="compact"
          className="shrink-0 text-custom-sm"
        />
      : null}
    </div>
  );
}
