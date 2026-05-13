import React from "react";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import Breadcrumb from "@/components/Common/Breadcrumb";
import SellerHelperDashboard from "@/components/SellerHelper/SellerHelperDashboard";
import type { ConceptionAdminInitialData } from "@/hooks/useConceptionAdminData";
import { buildConceptionOverview } from "@/server/conception/metrics";
import {
  listConceptionAlertsForAdmin,
  listDismissedConceptionAlertsForAdmin,
} from "@/server/conception/conception-db";
import {
  sellerHelperContainer,
  sellerHelperSection,
  sellerPanel,
  sellerPanelPadding,
  sellerSecondaryButton,
} from "@/components/SellerHelper/layout";
import { auth } from "@/server/lib/auth";
import { isPrivilegedAdminEmail } from "@/server/lib/admin-access";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

export const metadata: Metadata = {
  title: "Seller Helper | Vitrina Store",
  description: "Store analytics, funnel, alerts, and recommendations for sellers",
};

export const dynamic = "force-dynamic";

export default async function SellerHelperPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/signin");
  }

  const currentUser = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const isAdmin = currentUser[0]?.role === "admin" || isPrivilegedAdminEmail(session.user.email);

  let initialData: ConceptionAdminInitialData | undefined;
  let initialError: string | null = null;
  if (isAdmin) {
    try {
      const [overview, alerts, resolvedAlerts] = await Promise.all([
        buildConceptionOverview(),
        listConceptionAlertsForAdmin({ limit: 50 }),
        listDismissedConceptionAlertsForAdmin({ limit: 12 }),
      ]);
      initialData = { overview, alerts, resolvedAlerts, recommendations: [] };
    } catch (error) {
      initialError = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <main>
      <Breadcrumb title="Seller Helper" pages={["seller helper"]} />

      <section className={sellerHelperSection}>
        <div className={sellerHelperContainer}>
          {isAdmin ?
            <SellerHelperDashboard initialData={initialData} initialError={initialError} />
          : <div className={`${sellerPanel} ${sellerPanelPadding} text-center`}>
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
