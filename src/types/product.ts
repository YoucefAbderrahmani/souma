export type Product = {
  title: string;
  description?: string;
  reviews: number;
  // detail mode (retail) price
  detailPrice: number;
  // optional vitrina mode (wholesale) price
  jomlaPrice?: number;
  category: string;
  id: number;
  /** Units available to sell (from catalog `instock`). */
  instock?: number;
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
  /** When set (structured DB products), gallery index maps to this color name for two-way sync. */
  colorImageSlots?: Array<{ colorName: string; url: string }>;
  /**
   * Hero strip text from structured merchandising (`additionalInfo` / Vitrina quick fixes).
   * Set in `getCatalogProducts` so grids show it without depending on client fetch + id alignment.
   */
  heroReviewSnippet?: string | null;
};
