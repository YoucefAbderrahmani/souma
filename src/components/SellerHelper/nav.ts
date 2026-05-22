export const SELLER_HELPER_NAV = [
  "Dashboard",
  "Conversion Funnel",
  "User Behavior",
  "Vitrina Recommendation",
  "AI Recommendations",
  "Inbox",
  "Security",
  "Alerts",
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
  "Conversion Funnel": {
    label: "Funnel",
    description: "Drop-offs from product view to payment.",
  },
  "User Behavior": {
    label: "Behavior",
    description: "Heatmaps, sources de trafic, profondeur de scroll et enregistrements de session.",
  },
  "Vitrina Recommendation": {
    label: "Vitrina",
    description: "Catalog and merchandising fixes by product.",
  },
  "AI Recommendations": {
    label: "AI",
    description: "Prioritized actions from your analytics signals.",
  },
  Inbox: {
    label: "Inbox",
    description: "Recommendations emailed to each role — mark implemented or dismiss.",
  },
  Security: {
    label: "Security",
    description: "Suspicious sessions and data integrity notes.",
  },
  Alerts: {
    label: "Alerts",
    description: "Active incidents and recent resolutions.",
  },
};
