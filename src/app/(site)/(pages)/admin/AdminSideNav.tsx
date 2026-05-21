"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";
import type { AdminMainTab } from "./AdminTabBar";
import {
  ADMIN_TAB_SELECT_EVENT,
  navigateAdminTab,
  readAdminTabFromUrl,
} from "./admin-tab-client-nav";

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
  const onAdminHome = pathname === "/admin";
  const [activeTab, setActiveTab] = useState<AdminMainTab>(() =>
    typeof window !== "undefined" && window.location.pathname === "/admin"
      ? readAdminTabFromUrl()
      : "users"
  );

  useEffect(() => {
    if (onAdminHome) setActiveTab(readAdminTabFromUrl());
  }, [onAdminHome, pathname]);

  useEffect(() => {
    const onTabSelect = (event: Event) => {
      setActiveTab((event as CustomEvent<{ tab: AdminMainTab }>).detail.tab);
    };
    const onPopState = () => {
      if (window.location.pathname === "/admin") {
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

  const selectAdminTab = useCallback((tab: AdminMainTab) => {
    setActiveTab(tab);
    navigateAdminTab(tab);
  }, []);

  return (
    <aside className="hidden lg:block fixed left-0 top-36 z-40 h-[calc(100vh-9rem)] w-64 overflow-y-auto border-r border-gray-3 bg-white/95 px-4 py-5 shadow-sm backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-wide text-dark-4">Admin navigation</p>

      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-4">Seller</p>
        {ADMIN_HOME_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onMouseEnter={() => TAB_PREFETCH[id]?.()}
            onFocus={() => TAB_PREFETCH[id]?.()}
            onClick={() => selectAdminTab(id)}
            className={linkClass(onAdminHome && activeTab === id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2 border-t border-gray-2 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-4">Data Tracking</p>
        <Link prefetch href="/sequence" className={linkClass(pathname === "/sequence")}>
          Sequences
        </Link>
        <Link prefetch href="/admin/item-assistant" className={linkClass(pathname === "/admin/item-assistant")}>
          Item Assistant Tracking
        </Link>
        <Link prefetch href="/admin/sales-analytics" className={linkClass(pathname === "/admin/sales-analytics")}>
          Session Timeline
        </Link>
        <Link prefetch href="/admin/ai-sales-analyst" className={linkClass(pathname === "/admin/ai-sales-analyst")}>
          AI Sales Analyst
        </Link>
      </div>
    </aside>
  );
}

export default memo(AdminSideNavInner);
