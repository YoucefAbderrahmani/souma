"use client";

import { ProductDemoPromoLabels } from "@/components/Common/ProductDemoPromoLabels";
import { ProductTrendingCountdown } from "@/components/Common/ProductTrendingCountdown";
import { PRODUCT_PROMO_CARD_LAYER_BASE_CLASS } from "@/lib/product-promo-label-tokens";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

/**
 * Promo pills + optional trending countdown above card hover actions.
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
      <div className="flex w-full max-w-full flex-col items-stretch gap-1.5 sm:items-end">
        {endsValid ?
          <ProductTrendingCountdown
            endsAt={endsAt!}
            variant="card"
            className="w-full max-w-full"
          />
        : null}
        <div className="flex w-full justify-end">
          <ProductDemoPromoLabels product={product} mode="raised" />
        </div>
      </div>
    </div>
  );
}
