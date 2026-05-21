import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { AdminMainTab } from "./AdminTabBar";
import { ADMIN_TAB_SELECT_EVENT, readAdminTabFromUrl } from "./admin-tab-client-nav";

export const ADMIN_HOME_PATH = "/admin";

/** Data tracking routes shown in the left admin sidebar. */
export const ADMIN_DATA_TRACKING_ROUTES = [
  { href: "/sequence", label: "Sequences", match: (path: string) => path === "/sequence" },
  {
    href: "/admin/item-assistant",
    label: "Item Assistant Tracking",
    match: (path: string) => path === "/admin/item-assistant",
  },
  {
    href: "/admin/sales-analytics",
    label: "Session Timeline",
    match: (path: string) => path === "/admin/sales-analytics",
  },
  {
    href: "/admin/ai-sales-analyst",
    label: "AI Sales Analyst",
    match: (path: string) => path === "/admin/ai-sales-analyst",
  },
] as const;

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

/** Data tracking and cross-section routes always use the Next.js router. */
export function navigateToAdminRoute(href: string, router: AppRouterInstance): void {
  if (typeof window === "undefined") return;
  const targetPath = href.split("?")[0] ?? href;
  if (window.location.pathname === targetPath) return;
  router.push(href);
}

export function prefetchAdminRoute(href: string, router: AppRouterInstance): void {
  try {
    router.prefetch(href);
  } catch {
    /* prefetch optional */
  }
}

export { readAdminTabFromUrl, ADMIN_TAB_SELECT_EVENT };
