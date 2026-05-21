import type { AdminMainTab } from "./AdminTabBar";

export const ADMIN_TAB_SELECT_EVENT = "admin:tab-select";

export function readAdminTabFromUrl(): AdminMainTab {
  if (typeof window === "undefined") return "users";
  const tab = new URLSearchParams(window.location.search).get("tab");
  if (tab === "conception") return "seller-helper";
  if (
    tab === "users" ||
    tab === "add-product" ||
    tab === "products" ||
    tab === "tracking" ||
    tab === "role-emails" ||
    tab === "seller-helper"
  ) {
    return tab;
  }
  return "users";
}

/** Switch admin home tab without a Next.js navigation (instant). */
export function navigateAdminTab(tab: AdminMainTab): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `/admin?tab=${tab}`);
  window.dispatchEvent(
    new CustomEvent<{ tab: AdminMainTab }>(ADMIN_TAB_SELECT_EVENT, { detail: { tab } })
  );
}
