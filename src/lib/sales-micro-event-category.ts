/** Buckets for AI Sales Analyst — aligned with `pa_*` product analytics events. */
export function salesMicroEventCategory(eventName: string): string {
  const n = eventName.toLowerCase();

  if (n.startsWith("pa_image") || n.startsWith("pa_scroll") || n.startsWith("pa_specs_view")) {
    return "Visual & engagement";
  }

  if (
    n.startsWith("pa_review") ||
    n.startsWith("pa_price") ||
    n.startsWith("pa_select_option") ||
    n.startsWith("pa_add_to_cart") ||
    n.startsWith("pa_remove_from_cart") ||
    n.startsWith("pa_checkout") ||
    n.startsWith("pa_purchase") ||
    n.startsWith("pa_abandon")
  ) {
    return "Decision & checkout";
  }

  if (
    n.startsWith("pa_global") ||
    n.startsWith("pa_navigation") ||
    n.startsWith("pa_search") ||
    n.startsWith("pa_product_view") ||
    n.startsWith("pa_product_ident") ||
    n.startsWith("pa_add_to_wishlist")
  ) {
    return "Navigation & context";
  }

  if (n.startsWith("pa_performance") || n.startsWith("pa_js_error")) {
    return "Technical performance";
  }

  if (n.startsWith("pa_")) {
    return "Product analytics";
  }

  return "Other";
}

/** Fixed list for admin filters / exports. */
export const SALES_MICRO_CATEGORY_OPTIONS = [
  "Visual & engagement",
  "Decision & checkout",
  "Navigation & context",
  "Technical performance",
  "Product analytics",
  "Other",
] as const;
