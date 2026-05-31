import type { AdminMainTab } from "./AdminTabBar";

export const ADMIN_TAB_SELECT_EVENT = "admin:tab-select";

const VALID_TABS: AdminMainTab[] = [
  "users",
  "role-management",
  "add-product",
  "products",
  "role-emails",
];

export function readAdminTabFromUrl(): AdminMainTab {
  if (typeof window === "undefined") return "users";
  const tab = new URLSearchParams(window.location.search).get("tab");
  if (tab === "conception" || tab === "seller-helper" || tab === "tracking") {
    return "users";
  }
  if (VALID_TABS.includes(tab as AdminMainTab)) {
    return tab as AdminMainTab;
  }
  return "users";
}

/** Switch admin home tab without a Next.js navigation. */
export function navigateAdminTab(tab: AdminMainTab): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `/admin?tab=${tab}`);
  window.dispatchEvent(
    new CustomEvent<{ tab: AdminMainTab }>(ADMIN_TAB_SELECT_EVENT, { detail: { tab } })
  );
}
