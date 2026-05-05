import React from "react";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/server/lib/auth";
import { isPrivilegedAdminEmail } from "@/server/lib/admin-access";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import ConceptionIntelligenceDashboard from "../admin/ConceptionIntelligenceDashboard";

export const metadata: Metadata = {
  title: "Seller Helper | Vitrina Store",
  description: "Store analytics, funnel, alerts, and recommendations for sellers",
};

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
  if (!isAdmin) {
    return (
      <main className="overflow-hidden pb-20 pt-40 sm:pt-44 lg:pt-36 xl:pt-45">
        <section className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
          <div className="rounded-lg border border-gray-3 bg-white p-8 text-center">
            <h1 className="text-2xl font-semibold text-dark">Seller Helper</h1>
            <p className="mt-3 text-dark-4">You do not have permission to access this page.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/my-account"
                className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
              >
                Go to My Account
              </Link>
              <Link
                href="/"
                className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="overflow-hidden bg-gradient-to-b from-[#fff8f1] via-[#fffaf5] to-[#fcfcfd] pb-20 pt-40 sm:pt-44 lg:pt-36 xl:pt-45">
      <section className="mx-auto w-full max-w-[1360px] px-4 sm:px-8 xl:px-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-orange-200/80 bg-gradient-to-r from-white via-orange-50/70 to-amber-50/70 p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-sm font-medium text-orange-700">Seller Helper</p>
            <h1 className="mt-1 text-2xl font-semibold text-dark">Your store dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              Conversion funnel, traffic KPIs, security signals, alerts, and recommendations powered by your store
              analytics.
            </p>
          </div>
          <Link
            href="/admin"
            className="shrink-0 rounded-lg border border-orange-300 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:from-orange-400 hover:to-amber-400"
          >
            Open Admin Panel
          </Link>
        </div>
        <ConceptionIntelligenceDashboard />
      </section>
    </main>
  );
}
