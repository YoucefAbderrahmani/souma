"use client";

import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";
import { ProductDemoPromoLabels } from "@/components/Common/ProductDemoPromoLabels";
import { ProductHeroReviewOverlay } from "@/components/Common/ProductHeroReviewOverlay";
import { ProductHeroReviewSnippet } from "@/components/Common/ProductHeroReviewSnippet";

export type ProductCatalogImageMerchProduct = Pick<Product, "id" | "title" | "description">;

type Props = {
  product: ProductCatalogImageMerchProduct;
  src: ImageProps["src"];
  alt: string;
  width: number;
  height: number;
  /** Extra classes on the outer frame (clips to photo shape) */
  className?: string;
  imageClassName?: string;
  /** PDP: hero line from merchandising, drawn inside the photo */
  heroReviewSnippet?: string | null;
  /** Cards: fetch / description-based hero strip inside the photo */
  showHeroReviewOverlay?: boolean;
  /** When false, promo pills are omitted here (e.g. rendered in `ProductCardPromoLayer` above hover). */
  showPromoLabels?: boolean;
  priority?: boolean;
};

/**
 * Single product photo surface: image + promo labels + optional hero review,
 * all clipped by the same rounded frame so overlays read as part of the picture.
 */
export function ProductCatalogImageWithMerch({
  product,
  src,
  alt,
  width,
  height,
  className,
  imageClassName,
  heroReviewSnippet = null,
  showHeroReviewOverlay = false,
  showPromoLabels = true,
  priority,
}: Props) {
  const snippet = heroReviewSnippet?.trim() ?? "";

  return (
    <span
      className={cn(
        "group relative isolate inline-block max-h-full max-w-full overflow-hidden rounded-lg",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn("block h-auto w-full rounded-lg object-cover align-middle", imageClassName)}
      />

      {snippet ?
        <ProductHeroReviewSnippet snippet={snippet} variant="storefront" />
      : showHeroReviewOverlay ?
        <ProductHeroReviewOverlay
          productId={product.id}
          description={product.description}
          variant="storefront"
        />
      : null}

      {showPromoLabels ?
        <span className="pointer-events-none absolute inset-0 z-[36]">
          <ProductDemoPromoLabels product={product} />
        </span>
      : null}
    </span>
  );
}
