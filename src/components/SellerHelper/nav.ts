export const SELLER_HELPER_NAV = [
  "Dashboard",
  "User Behavior",
  "Conversion Funnel",
  "Vitrina Recommendation",
  "AI Recommendations",
  "Alerts",
  "Security",
] as const;

export type SellerHelperNavItem = (typeof SELLER_HELPER_NAV)[number];

export const SELLER_HELPER_NAV_META: Record<
  SellerHelperNavItem,
  { label: string; description: string }
> = {
  Dashboard: {
    label: "Overview",
    description: "Traffic, devices, and top pages at a glance.",
  },
  "User Behavior": {
    label: "Behavior",
    description: "Heatmaps, journeys, scroll depth, and session replays.",
  },
  "Conversion Funnel": {
    label: "Funnel",
    description: "Drop-offs from product view to payment.",
  },
  "Vitrina Recommendation": {
    label: "Vitrina",
    description: "Catalog and merchandising fixes by product.",
  },
  "AI Recommendations": {
    label: "AI",
    description: "Prioritized actions from your analytics signals.",
  },
  Alerts: {
    label: "Alerts",
    description: "Active incidents and recent resolutions.",
  },
  Security: {
    label: "Security",
    description: "Suspicious sessions and data integrity notes.",
  },
};
