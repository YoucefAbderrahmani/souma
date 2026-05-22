"use client";

import { ProductDemoPromoLabels } from "@/components/Common/ProductDemoPromoLabels";
import { PRODUCT_PROMO_CARD_LAYER_BASE_CLASS } from "@/lib/product-promo-label-tokens";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

/** Promo pills above card hover actions (countdown sits beside price). */
export function ProductCardPromoLayer({
  product,
  className,
}: {
  product: Pick<Product, "id" | "title">;
  className?: string;
}) {
  return (
    <div className={cn(PRODUCT_PROMO_CARD_LAYER_BASE_CLASS, className)} aria-hidden>
      <div className="flex w-full justify-end">
        <ProductDemoPromoLabels product={product} mode="raised" />
      </div>
    </div>
  );
}
