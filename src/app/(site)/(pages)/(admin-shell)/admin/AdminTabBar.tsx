"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { sellerNav, sellerNavButton } from "@/components/SellerHelper/layout";
import { useOptimisticTabIndicator } from "@/hooks/useOptimisticTabIndicator";

export type AdminMainTab =
  | "users"
  | "role-management"
  | "add-product"
  | "products"
  | "role-emails";

const BASE_TABS: { id: AdminMainTab; label: string }[] = [
  { id: "users", label: "Users" },
  { id: "add-product", label: "Add Items" },
  { id: "products", label: "Stock & Edit Items" },
  { id: "role-emails", label: "Assign role emails" },
];

const ROLE_MANAGEMENT_TAB = { id: "role-management" as const, label: "Role management" };

function AdminTabBarInner({
  activeTab,
  onSelect,
  showRoleManagement = false,
}: {
  activeTab: AdminMainTab;
  onSelect: (tab: AdminMainTab) => void;
  showRoleManagement?: boolean;
}) {
  const { indicatorTab, selectTab } = useOptimisticTabIndicator(activeTab);
  const tabs = showRoleManagement
    ? [BASE_TABS[0], ROLE_MANAGEMENT_TAB, ...BASE_TABS.slice(1)]
    : BASE_TABS;

  return (
    <nav className={cn(sellerNav, "top-24")} aria-label="Admin sections">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => selectTab(id, onSelect)}
          className={sellerNavButton(indicatorTab === id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export const AdminTabBar = memo(AdminTabBarInner);
