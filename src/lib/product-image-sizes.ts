/** Responsive `sizes` for shop / home product cards (~250–280px tiles, 2–3 columns). */
export const PRODUCT_CARD_IMAGE_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px";

/** Fixed 1:1 tile so catalog photos do not stretch card height by aspect ratio. */
export const PRODUCT_CARD_IMAGE_FRAME_CLASS =
  "relative mb-4 w-full aspect-square overflow-hidden rounded-lg bg-[#F6F7FB]";

export const PRODUCT_CARD_IMAGE_FRAME_SHADOW_CLASS =
  "relative mb-4 w-full aspect-square overflow-hidden rounded-lg bg-white shadow-1";

/** List layout: fixed-width square thumbnail column. */
export const PRODUCT_LIST_IMAGE_FRAME_CLASS =
  "relative aspect-square w-full max-w-[270px] shrink-0 overflow-hidden rounded-lg bg-[#F6F7FB] shadow-list";

/** PDP main gallery hero (max ~570px column). */
export const PRODUCT_PDP_HERO_IMAGE_SIZES = "(max-width: 1024px) 92vw, 560px";

/** PDP thumbnail strip (~50–100px). */
export const PRODUCT_PDP_THUMB_IMAGE_SIZES = "100px";
