"use client";

import { ProductDemoPromoLabels } from "@/components/Common/ProductDemoPromoLabels";
import { ProductTrendingCountdown } from "@/components/Common/ProductTrendingCountdown";
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
  product: Pick<Product, "id" | "title" | "trendingCountdownEndsAt">;
  className?: string;
}) {
  const raw = product.trendingCountdownEndsAt?.trim();
  const endsAt = raw ? new Date(raw) : null;
  const endsValid = endsAt != null && Number.isFinite(endsAt.getTime());

  return (
    <div className={cn(PRODUCT_PROMO_CARD_LAYER_BASE_CLASS, className)} aria-hidden>
      <div className="flex w-full max-w-full flex-col items-end gap-1">
        {endsValid ?
          <div className="max-w-[min(100%,12rem)] text-right">
            <ProductTrendingCountdown
              endsAt={endsAt!}
              className="text-[10px] font-medium leading-tight sm:text-[11px]"
            />
          </div>
        : null}
        <ProductDemoPromoLabels product={product} mode="raised" />
      </div>
    </div>
  );
}
