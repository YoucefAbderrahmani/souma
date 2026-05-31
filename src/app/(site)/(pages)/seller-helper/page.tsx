import React from "react";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/components/Common/Breadcrumb";
import SellerHelperDashboard from "@/components/SellerHelper/SellerHelperDashboard";
import { SellerHelperLogo } from "@/components/SellerHelper/SellerHelperLogo";
import type { ConceptionAdminInitialData } from "@/hooks/useConceptionAdminData";
import { buildConceptionOverview } from "@/server/conception/metrics";
import {
  listConceptionAlertsForAdmin,
  listDismissedConceptionAlertsForAdmin,
  listConceptionRecommendationsForAdmin,
  listConceptionInboxForAdmin,
} from "@/server/conception/conception-db";
import {
  sellerHelperContainer,
  sellerHelperSection,
  sellerPanel,
  sellerPanelPadding,
  sellerSecondaryButton,
} from "@/components/SellerHelper/layout";
import { auth } from "@/server/lib/auth";
import { getSessionAccess } from "@/server/lib/staff-access";
import { isNeonDataTransferQuotaError, noteDatabaseOutage } from "@/server/db-degraded";

export const metadata: Metadata = {
  title: "Seller Helper | Vitrina Store",
  description: "Store analytics, funnel, alerts, and recommendations for sellers",
};

export const dynamic = "force-dynamic";

export default async function SellerHelperPage() {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });
  } catch (error) {
    if (isNeonDataTransferQuotaError(error)) noteDatabaseOutage();
    redirect("/signin");
  }

  if (!session?.user) {
    redirect("/signin");
  }

  let isStaff = false;
  try {
    const access = await getSessionAccess(await headers());
    isStaff = access?.isStaff ?? false;
  } catch (error) {
    if (isNeonDataTransferQuotaError(error)) noteDatabaseOutage();
  }

  let initialData: ConceptionAdminInitialData | undefined;
  let initialError: string | null = null;
  if (isStaff) {
    try {
      const [overview, alerts, resolvedAlerts, recommendations, inbox] = await Promise.all([
        buildConceptionOverview(),
        listConceptionAlertsForAdmin({ limit: 50 }),
        listDismissedConceptionAlertsForAdmin({ limit: 12 }),
        listConceptionRecommendationsForAdmin({ limit: 40 }),
        listConceptionInboxForAdmin({ limit: 40 }),
      ]);
      initialData = { overview, alerts, resolvedAlerts, recommendations, inbox };
    } catch (error) {
      initialError = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <main>
      <Breadcrumb title="Seller Helper" pages={["seller helper"]} />

      <section className={sellerHelperSection}>
        <div className={sellerHelperContainer}>
          {isStaff ?
            <SellerHelperDashboard initialData={initialData} initialError={initialError} />
          : <div className={`${sellerPanel} ${sellerPanelPadding} text-center`}>
              <div className="mx-auto mb-4 flex justify-center">
                <SellerHelperLogo size={48} title="Seller Helper" />
              </div>
              <h2 className="text-2xl font-semibold text-dark">Seller Helper</h2>
              <p className="mt-3 text-dark-4">You do not have permission to access this page.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href="/my-account" className={sellerSecondaryButton}>
                  Go to My Account
                </Link>
                <Link href="/" className={sellerSecondaryButton}>
                  Back to Home
                </Link>
              </div>
            </div>
          }
        </div>
      </section>
    </main>
  );
}
