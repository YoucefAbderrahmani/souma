/**
 * Storefront promo pills on product photos. Rendered inside
 * `ProductCatalogImageWithMerch` so labels are clipped to the image frame.
 *
 * Pill size, padding, column width, and card overlay placement live in
 * `src/lib/product-promo-label-tokens.ts` — reuse those when adding new label kinds.
 */

/** `image` = orange pills on the photo. `priceRow` = compact line under list/PDP price (black text). */
export type PromoLabelPlacement = "image" | "priceRow";

export type ProductPromoLabel =
  | {
      kind: "text";
      text: string;
      /** default: right */
      align?: "left" | "right";
      /** default: `image` */
      placement?: PromoLabelPlacement;
    }
  | {
      kind: "timer";
      /** Lead-in before countdown; use `""` for countdown only */
      prefix: string;
      /** Unique sessionStorage key for this promo end time */
      storageKey: string;
      /** When no stored end exists, promo length from first view (ms). Default ~2d 5h 30m */
      defaultDurationMs?: number;
      /** default: right (only used when `placement` is `image`) */
      align?: "left" | "right";
      /** default: `priceRow` (timers belong under the price unless overridden) */
      placement?: PromoLabelPlacement;
    };

const DEFAULT_TIMER_DURATION_MS =
  2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 30 * 60 * 1000;

/** Logitech MX Master 3 — demo timer beside Vitrina price; Promo + Limited on the image. */
const MX_MASTER_PROMO_LABELS: readonly ProductPromoLabel[] = [
  {
    kind: "timer",
    prefix: "Ends in",
    storageKey: "demo-promo-mx-master-3-showcase",
    defaultDurationMs: 72 * 60 * 60 * 1000,
  },
  { kind: "text", text: "Promo" },
  { kind: "text", text: "Limited" },
];

/**
 * Promo label stacks keyed by product `id`. Add new ids here to reuse the same UI.
 *
 * Example — timer to the **right of the orange Vitrina price** (black); pills stay on the photo:
 * ```
 * 6: [
 *   { kind: "timer", prefix: "Ends in", storageKey: "promo-product-6-ends", defaultDurationMs: 172_800_000 },
 *   { kind: "text", text: "Promo" },
 *   { kind: "text", text: "Limited" },
 * ],
 * ```
 * Timers default to `placement: "priceRow"` (beside the orange Vitrina price in the storefront). Use `placement: "image"` for an orange pill countdown on the photo instead.
 */
export const PRODUCT_PROMO_LABELS_BY_ID: Record<number, readonly ProductPromoLabel[]> = {
  6: MX_MASTER_PROMO_LABELS,
};

export { DEFAULT_TIMER_DURATION_MS };

export function productPromoLabelPlacement(entry: ProductPromoLabel): PromoLabelPlacement {
  if ("placement" in entry && entry.placement) return entry.placement;
  return entry.kind === "timer" ? "priceRow" : "image";
}

export function getProductPromoLabels(product: { id: number; title: string }): readonly ProductPromoLabel[] {
  const fromId = PRODUCT_PROMO_LABELS_BY_ID[product.id];
  if (fromId?.length) return fromId;

  const t = product.title.toLowerCase();
  if (t.includes("logitech") && t.includes("mx master")) {
    return MX_MASTER_PROMO_LABELS;
  }

  return [];
}

export function getProductPromoImageLabels(
  product: { id: number; title: string }
): readonly ProductPromoLabel[] {
  return getProductPromoLabels(product).filter((e) => productPromoLabelPlacement(e) === "image");
}

export function getProductPromoPriceRowLabels(
  product: { id: number; title: string }
): readonly ProductPromoLabel[] {
  return getProductPromoLabels(product).filter((e) => productPromoLabelPlacement(e) === "priceRow");
}

/** Price-row entries that are promo timers (shown to the right of the orange Vitrina price only). */
export function getProductPromoPriceRowTimerLabels(
  product: { id: number; title: string }
): readonly ProductPromoLabel[] {
  return getProductPromoPriceRowLabels(product).filter((e) => e.kind === "timer");
}

/** Price-row copy that is not a timer (e.g. extra text); stays on the compact line under prices. */
export function getProductPromoPriceRowNonTimerLabels(
  product: { id: number; title: string }
): readonly ProductPromoLabel[] {
  return getProductPromoPriceRowLabels(product).filter((e) => e.kind !== "timer");
}
