"use client";

import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useState, useTransition } from "react";
import type { AdminMainTab } from "./AdminTabBar";
import { ADMIN_TAB_SELECT_EVENT, readAdminTabFromUrl } from "./admin-tab-client-nav";
import {
  ADMIN_DATA_TRACKING_ROUTES,
  ADMIN_HOME_PATH,
  navigateToAdminHomeTab,
  navigateToAdminRoute,
  prefetchAdminRoute,
} from "./admin-shell-nav";

function linkClass(isActive: boolean): string {
  return isActive
    ? "block w-full rounded-lg bg-orange px-3 py-2 text-sm font-medium text-white shadow-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
    : "block w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm font-medium text-dark outline-none hover:border-[#FB923C] hover:text-[#FB923C] focus:outline-none focus-visible:outline-none focus-visible:ring-0";
}

const ADMIN_HOME_TABS: { id: AdminMainTab; label: string }[] = [
  { id: "users", label: "Users" },
  { id: "add-product", label: "Add Items" },
  { id: "products", label: "Stock & Edit Items" },
  { id: "tracking", label: "Analytics tracking" },
  { id: "role-emails", label: "Assign role emails" },
  { id: "seller-helper", label: "Seller Helper" },
];

const TAB_PREFETCH: Partial<Record<AdminMainTab, () => void>> = {
  "seller-helper": () => {
    void import("@/components/SellerHelper/SellerHelperDashboard");
  },
};

function AdminSideNavInner() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const onAdminHome = pathname === ADMIN_HOME_PATH;
  const [activeTab, setActiveTab] = useState<AdminMainTab>(() =>
    typeof window !== "undefined" && window.location.pathname === ADMIN_HOME_PATH
      ? readAdminTabFromUrl()
      : "users"
  );
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const displayPath = pendingPath ?? pathname;

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  useEffect(() => {
    if (onAdminHome) setActiveTab(readAdminTabFromUrl());
  }, [onAdminHome, pathname]);

  useEffect(() => {
    const onTabSelect = (event: Event) => {
      setActiveTab((event as CustomEvent<{ tab: AdminMainTab }>).detail.tab);
    };
    const onPopState = () => {
      if (window.location.pathname === ADMIN_HOME_PATH) {
        setActiveTab(readAdminTabFromUrl());
      }
    };
    window.addEventListener(ADMIN_TAB_SELECT_EVENT, onTabSelect);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener(ADMIN_TAB_SELECT_EVENT, onTabSelect);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const goToRoute = useCallback(
    (href: string) => {
      const targetPath = href.split("?")[0] ?? href;
      setPendingPath(targetPath);
      startTransition(() => {
        navigateToAdminRoute(href, router);
      });
    },
    [router]
  );

  const selectAdminTab = useCallback(
    (tab: AdminMainTab) => {
      setActiveTab(tab);
      setPendingPath(ADMIN_HOME_PATH);
      startTransition(() => {
        navigateToAdminHomeTab(tab, router);
      });
    },
    [router]
  );

  return (
    <aside className="hidden lg:block fixed left-0 top-36 z-40 h-[calc(100vh-9rem)] w-64 overflow-y-auto border-r border-gray-3 bg-white/95 px-4 py-5 shadow-sm backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-wide text-dark-4">Admin navigation</p>

      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-4">Seller</p>
        {ADMIN_HOME_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onMouseEnter={() => {
              TAB_PREFETCH[id]?.();
              prefetchAdminRoute(`${ADMIN_HOME_PATH}?tab=${id}`, router);
            }}
            onFocus={() => {
              TAB_PREFETCH[id]?.();
              prefetchAdminRoute(`${ADMIN_HOME_PATH}?tab=${id}`, router);
            }}
            onClick={() => selectAdminTab(id)}
            className={linkClass(
              (displayPath === ADMIN_HOME_PATH || onAdminHome) && activeTab === id
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2 border-t border-gray-2 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-4">Data Tracking</p>
        {ADMIN_DATA_TRACKING_ROUTES.map(({ href, label, match }) => (
          <button
            key={href}
            type="button"
            onMouseEnter={() => prefetchAdminRoute(href, router)}
            onFocus={() => prefetchAdminRoute(href, router)}
            onClick={() => goToRoute(href)}
            className={linkClass(match(displayPath))}
          >
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}

export default memo(AdminSideNavInner);
