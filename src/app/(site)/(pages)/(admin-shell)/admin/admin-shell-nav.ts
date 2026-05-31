import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { AdminMainTab } from "./AdminTabBar";
import { ADMIN_TAB_SELECT_EVENT, readAdminTabFromUrl } from "./admin-tab-client-nav";

export const ADMIN_HOME_PATH = "/admin";

/** Tabs on /admin (catalog + users; Seller Helper is only on /seller-helper). */
export const ADMIN_HOME_TAB_IDS = [
  "users",
  "role-management",
  "add-product",
  "products",
  "role-emails",
] as const satisfies readonly AdminMainTab[];

export function adminHomeTabUrl(tab: AdminMainTab): string {
  return `${ADMIN_HOME_PATH}?tab=${tab}`;
}

function dispatchAdminTab(tab: AdminMainTab): void {
  window.dispatchEvent(
    new CustomEvent<{ tab: AdminMainTab }>(ADMIN_TAB_SELECT_EVENT, { detail: { tab } })
  );
}

/** Seller tabs on /admin: instant client switch. From other routes: real navigation. */
export function navigateToAdminHomeTab(tab: AdminMainTab, router: AppRouterInstance): void {
  const url = adminHomeTabUrl(tab);
  if (typeof window === "undefined") return;

  if (window.location.pathname === ADMIN_HOME_PATH) {
    window.history.replaceState(null, "", url);
    dispatchAdminTab(tab);
    return;
  }

  router.push(url);
}

/** Legacy data-tracking URLs redirect to admin home. */
export function navigateToAdminRoute(href: string, router: AppRouterInstance): void {
  if (typeof window === "undefined") return;
  router.push(ADMIN_HOME_PATH);
}

export function prefetchAdminRoute(_href: string, _router: AppRouterInstance): void {
  /* no-op — data-tracking routes removed from admin shell */
}

export { readAdminTabFromUrl, ADMIN_TAB_SELECT_EVENT };
