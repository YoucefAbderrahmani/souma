export type Product = {
  title: string;
  description?: string;
  /** Count of storefront `product_review` rows for this product id. */
  reviews: number;
  /** Mean star rating 0–5 from real reviews; 0 when there are none. */
  averageRating: number;
  // detail mode (retail) price
  detailPrice: number;
  // optional vitrina mode (wholesale) price
  jomlaPrice?: number;
  category: string;
  id: number;
  /** Ms since epoch from admin slug suffix; used to sort New Arrivals newest-first. */
  catalogAddedAt?: number;
  /** Vitrina catalog-boost quick fix — sorts ahead of older listings when higher. */
  catalogBoostAt?: number;
  /** Units available to sell (from catalog `instock`). */
  instock?: number;
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
  /** When set (structured DB products), gallery index maps to this color name for two-way sync. */
  colorImageSlots?: Array<{ colorName: string; url: string }>;
  /**
   * Top-review banner on the product image — only after the Quality & reviews Vitrina quick fix
   * (`Merch: Hero review` in structured description). Not set from live review counts alone.
   */
  heroReviewSnippet?: string | null;
  /** ISO 8601 end instant when Vitrina “trending countdown” quick fix is active (catalog cards + PDP). */
  trendingCountdownEndsAt?: string | null;
};
