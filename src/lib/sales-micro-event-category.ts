/** Buckets aligned with AI Sales Analyst signal groups. */
export function salesMicroEventCategory(eventName: string): string {
  const n = eventName.toLowerCase();

  if (
    n.includes("image") ||
    n === "zoom_count" ||
    n.includes("video_") ||
    n === "accordion_expand_event" ||
    n === "text_copy_event" ||
    n.includes("time_on_image")
  ) {
    return "Visual & content";
  }

  if (
    n.includes("price") ||
    n.includes("review") ||
    n.includes("variant") ||
    n === "out_of_stock_click" ||
    n === "purchase_now_click" ||
    n.includes("cart") ||
    n.includes("checkout")
  ) {
    return "Decision friction";
  }

  if (
    n.includes("breadcrumb") ||
    n.includes("referrer") ||
    n.includes("search") ||
    n === "tab_switch_event" ||
    n.includes("product_page_enter") ||
    n.includes("sequence")
  ) {
    return "Navigation & context";
  }

  if (
    n.includes("lcp") ||
    n.includes("web_vitals") ||
    n.includes("navigation_timing") ||
    n.includes("rage_click") ||
    n === "device_browser_context" ||
    n.includes("page_navigation")
  ) {
    return "Technical performance";
  }

  return "Other";
}
