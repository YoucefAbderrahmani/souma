"use client";

import SellerHelperDashboard from "@/components/SellerHelper/SellerHelperDashboard";
import type { ConceptionAdminInitialData } from "@/hooks/useConceptionAdminData";

/**
 * Admin intelligence UI — same light Seller Helper design and shared sections.
 * @deprecated Prefer embedding via AdminPanels tab; kept for direct imports.
 */
export default function ConceptionIntelligenceDashboard({
  initialData,
  initialError = null,
}: {
  initialData?: ConceptionAdminInitialData;
  initialError?: string | null;
}) {
  return (
    <SellerHelperDashboard initialData={initialData} initialError={initialError} variant="admin" />
  );
}
