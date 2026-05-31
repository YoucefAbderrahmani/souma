"use client";

import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useState, useTransition } from "react";
import type { AdminMainTab } from "./AdminTabBar";
import { ADMIN_TAB_SELECT_EVENT, readAdminTabFromUrl } from "./admin-tab-client-nav";
import {
  ADMIN_HOME_PATH,
  ADMIN_HOME_TAB_IDS,
  navigateToAdminHomeTab,
  prefetchAdminRoute,
} from "./admin-shell-nav";

function linkClass(isActive: boolean): string {
  return isActive
    ? "block w-full rounded-lg bg-orange px-3 py-2 text-sm font-medium text-white shadow-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
    : "block w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm font-medium text-dark outline-none hover:border-[#FB923C] hover:text-[#FB923C] focus:outline-none focus-visible:outline-none focus-visible:ring-0";
}

const TAB_LABELS: Record<AdminMainTab, string> = {
  users: "Users",
  "role-management": "Role management",
  "add-product": "Add Items",
  products: "Stock & Edit Items",
  "role-emails": "Assign role emails",
};

function AdminSideNavInner({ showRoleManagement = false }: { showRoleManagement?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const onAdminHome = pathname === ADMIN_HOME_PATH;
  const [activeTab, setActiveTab] = useState<AdminMainTab>(() =>
    typeof window !== "undefined" && window.location.pathname === ADMIN_HOME_PATH
      ? readAdminTabFromUrl()
      : "users"
  );

  const visibleTabs = ADMIN_HOME_TAB_IDS.filter(
    (id) => id !== "role-management" || showRoleManagement
  );

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

  const selectAdminTab = useCallback(
    (tab: AdminMainTab) => {
      setActiveTab(tab);
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
        {visibleTabs.map((id) => (
          <button
            key={id}
            type="button"
            onMouseEnter={() => prefetchAdminRoute(`${ADMIN_HOME_PATH}?tab=${id}`, router)}
            onFocus={() => prefetchAdminRoute(`${ADMIN_HOME_PATH}?tab=${id}`, router)}
            onClick={() => selectAdminTab(id)}
            className={linkClass(onAdminHome && activeTab === id)}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>
    </aside>
  );
}

export default memo(AdminSideNavInner);
