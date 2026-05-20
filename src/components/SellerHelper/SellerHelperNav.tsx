"use client";

import { memo } from "react";
import { sellerNav, sellerNavButton } from "./layout";
import { SELLER_HELPER_NAV, SELLER_HELPER_NAV_META, type SellerHelperNavItem } from "./nav";

const SECTION_PREFETCH: Partial<Record<SellerHelperNavItem, () => void>> = {
  Timeline: () => {
    void import("./timeline-tab");
  },
  "AI Recommendations": () => {
    void import("./sections");
  },
  Alerts: () => {
    void import("./sections");
  },
};

function SellerHelperNavInner({
  activeNav,
  ariaLabel,
  onSelect,
}: {
  activeNav: SellerHelperNavItem;
  ariaLabel: string;
  onSelect: (item: SellerHelperNavItem) => void;
}) {
  return (
    <nav className={sellerNav} aria-label={ariaLabel}>
      {SELLER_HELPER_NAV.map((item) => (
        <button
          key={item}
          type="button"
          onMouseEnter={() => SECTION_PREFETCH[item]?.()}
          onFocus={() => SECTION_PREFETCH[item]?.()}
          onClick={() => onSelect(item)}
          className={sellerNavButton(activeNav === item)}
          aria-current={activeNav === item ? "page" : undefined}
        >
          {SELLER_HELPER_NAV_META[item].label}
        </button>
      ))}
    </nav>
  );
}

export const SellerHelperNav = memo(SellerHelperNavInner);
