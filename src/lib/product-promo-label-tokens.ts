/**
 * Canonical layout + typography for storefront promo pills (Promo, Limited, timers, etc.).
 *
 * **When adding new label types** in `getProductPromoLabels` / `ProductPromoLabel`, reuse these
 * tokens so spacing, size, and corner alignment stay consistent across:
 * - `ProductDemoPromoLabels` (`embedded` on the photo, `raised` on the card overlay)
 * - `ProductCardPromoLayer`
 *
 * **Stacking (cards):** hover actions use `z-20`; this overlay defaults to `z-30` so labels stay
 * visible. PDP may pass `className="z-[55]"` on `ProductCardPromoLayer`; keep zoom above that (`z-[60]`).
 */
export const PRODUCT_PROMO_PILL_CLASS =
  "pointer-events-none max-w-[min(100%,10.5rem)] truncate rounded-sm px-1.5 py-px text-[9px] font-semibold uppercase leading-tight tracking-wide text-white shadow-sm bg-[#F27430] sm:max-w-[min(100%,12rem)] sm:px-2 sm:py-0.5 sm:text-[10px]";

/** Vertical gap between stacked pills */
export const PRODUCT_PROMO_STACK_GAP_CLASS = "gap-0.5";

/** Max width of a pill column (embedded corners + raised stack) */
export const PRODUCT_PROMO_COLUMN_MAX_CLASS =
  "max-w-[min(92%,11rem)] sm:max-w-[min(92%,13rem)]";

/**
 * Padding inside each embedded corner column (positions pills slightly down from the image top).
 */
export const PRODUCT_PROMO_EMBEDDED_SIDE_PAD_CLASS =
  "px-1.5 pb-1.5 pt-1 sm:px-2.5 sm:pb-2 sm:pt-1.5";

/** `mode="raised"`: flex column wrapper (parent handles absolute + z-index) */
export const PRODUCT_PROMO_RAISED_STACK_CLASS = [
  "pointer-events-none flex flex-col items-end",
  PRODUCT_PROMO_COLUMN_MAX_CLASS,
  PRODUCT_PROMO_STACK_GAP_CLASS,
].join(" ");

/** Full-card overlay base (merge with optional `className` for PDP z-index, etc.) */
export const PRODUCT_PROMO_CARD_LAYER_BASE_CLASS =
  "pointer-events-none absolute inset-0 z-30 flex items-start justify-end px-1 pb-1 pt-1.5 sm:px-1.5 sm:pb-1.5 sm:pt-2";

/** Timers beside the orange Vitrina price (black). Non-timer `priceRow` copy uses the same token on the line below. */
export const PRODUCT_PROMO_PRICE_ROW_TEXT_CLASS =
  "text-xs font-medium leading-snug tracking-tight text-dark tabular-nums sm:text-sm";

/** First line above countdown on Vitrina price row (e.g. “Ends in”) */
export const PRODUCT_PROMO_PRICE_ROW_TIMER_PREFIX_CLASS =
  "block text-[10px] font-medium uppercase leading-tight tracking-wide text-dark/85 sm:text-[11px]";

/** Countdown line under prefix on Vitrina price row */
export const PRODUCT_PROMO_PRICE_ROW_TIMER_COUNT_CLASS =
  "block text-xs font-semibold tabular-nums leading-tight tracking-tight text-dark sm:text-sm";

/** Orange pill: stacked timer — outer shell (no single-line truncate). */
export const PRODUCT_PROMO_PILL_TIMER_STACK_OUTER_CLASS =
  "pointer-events-none max-w-[min(100%,10.5rem)] rounded-sm bg-[#F27430] px-1.5 py-0.5 text-left shadow-sm sm:max-w-[min(100%,12rem)] sm:px-2 sm:py-1";

/** Orange pill: small “Ends in” line */
export const PRODUCT_PROMO_PILL_TIMER_PREFIX_CLASS =
  "block text-[7px] font-semibold uppercase leading-none text-white/95 sm:text-[8px]";

/** Orange pill: countdown line */
export const PRODUCT_PROMO_PILL_TIMER_COUNT_CLASS =
  "block text-[9px] font-bold tabular-nums leading-tight text-white sm:text-[10px]";
