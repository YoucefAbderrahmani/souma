"use client";

import { ProductPromoPriceRowLabels } from "@/components/Common/ProductPromoPriceRowLabels";
import { getProductPromoPriceRowNonTimerLabels } from "@/lib/product-demo-promo-labels";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

/**
 * Optional line **below** the primary price row: non-timer `priceRow` promo copy only.
 * Stock is shown beside the star row (`ProductCardStarsRowWithStock`) or via `LiveProductAvailableQuantity` where there are no stars.
 */
export function ProductPriceAdjacentMeta({
  product,
  className,
}: {
  product: Pick<Product, "id" | "title" | "instock">;
  className?: string;
}) {
  const nonTimerLabels = getProductPromoPriceRowNonTimerLabels({ id: product.id, title: product.title });
  if (nonTimerLabels.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-0.5 flex w-full max-w-full min-w-0 flex-wrap items-baseline justify-start gap-x-2 gap-y-0.5 self-stretch text-xs leading-snug sm:text-sm",
        className
      )}
    >
      <ProductPromoPriceRowLabels product={{ id: product.id, title: product.title }} labels={nonTimerLabels} />
    </div>
  );
}
