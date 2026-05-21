"use client";

import { memo } from "react";
import { useOptimisticTabIndicator } from "@/hooks/useOptimisticTabIndicator";

export type AdminMainTab =
  | "users"
  | "add-product"
  | "products"
  | "tracking"
  | "role-emails"
  | "seller-helper";

const TABS: { id: AdminMainTab; label: string }[] = [
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

function AdminTabBarInner({
  activeTab,
  onSelect,
}: {
  activeTab: AdminMainTab;
  onSelect: (tab: AdminMainTab) => void;
}) {
  const { indicatorTab, selectTab } = useOptimisticTabIndicator(activeTab);

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onMouseEnter={() => TAB_PREFETCH[id]?.()}
          onFocus={() => TAB_PREFETCH[id]?.()}
          onClick={() => selectTab(id, onSelect)}
          className={`rounded-lg px-4 py-2 text-sm font-medium outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
            indicatorTab === id
              ? "bg-orange text-white shadow-sm"
              : "border border-gray-3 bg-white text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export const AdminTabBar = memo(AdminTabBarInner);
