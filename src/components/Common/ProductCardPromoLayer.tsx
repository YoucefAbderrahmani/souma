"use client";

import { ProductDemoPromoLabels } from "@/components/Common/ProductDemoPromoLabels";
import { PRODUCT_PROMO_CARD_LAYER_BASE_CLASS } from "@/lib/product-promo-label-tokens";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

/**
 * Sits above the slide-up hover actions (z-20) so promo pills stay visible; pointer-events pass through to buttons.
 * Base layout tokens: `PRODUCT_PROMO_CARD_LAYER_BASE_CLASS` in `@/lib/product-promo-label-tokens`.
 */
export function ProductCardPromoLayer({
  product,
  className,
}: {
  product: Pick<Product, "id" | "title">;
  className?: string;
}) {
  return (
    <div
      className={cn(PRODUCT_PROMO_CARD_LAYER_BASE_CLASS, className)}
      aria-hidden
    >
      <ProductDemoPromoLabels product={product} mode="raised" />
    </div>
  );
}
