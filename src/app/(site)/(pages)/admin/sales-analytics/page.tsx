import React from "react";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import SalesMicroEventsTable from "@/components/Admin/SalesMicroEventsTable";
import { listSalesMicroSessionsForAdmin } from "@/server/sales-analyst/micro-events-admin";
import type { SalesMicroSessionAdmin } from "@/types/sales-micro-analytics";

export const metadata: Metadata = {
  title: "Sales micro-events | Souma Store Admin",
  description: "Session-level product and checkout interaction telemetry",
};

const SalesAnalyticsAdminPage = async () => {
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

  if (currentUser[0]?.role !== "admin") {
    return (
      <main className="overflow-hidden pb-20 pt-40 sm:pt-44 lg:pt-36 xl:pt-45">
        <section className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
          <div className="rounded-lg border border-gray-3 bg-white p-8 text-center">
            <h1 className="text-2xl font-semibold text-dark">Sales analytics</h1>
            <p className="mt-3 text-dark-4">You do not have permission to access this page.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/my-account"
                className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
              >
                Go to My Account
              </Link>
              <Link
                href="/admin"
                className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
              >
                Admin home
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  let initialSessions: SalesMicroSessionAdmin[] = [];
  let serverError: string | null = null;
  try {
    initialSessions = await listSalesMicroSessionsForAdmin({ maxSessions: 80 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    serverError =
      message.includes("sales_micro_event") || message.includes("does not exist")
        ? 'Database is missing the "sales_micro_event" table. Run drizzle/0003_sales_micro_event.sql on Neon, then reload.'
        : message;
  }

  return (
    <main className="overflow-hidden pb-20 pt-40 sm:pt-44 lg:pt-36 xl:pt-45">
      <section className="max-w-[1600px] w-full mx-auto px-4 sm:px-8 xl:px-0">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-dark-4">Admin</p>
            <h1 className="text-2xl font-semibold text-dark">Sales micro-events</h1>
            <p className="mt-1 max-w-3xl text-sm text-dark-4">
              Each browser session (same key as shopping sequences) lists all tracked interactions in order.{" "}
              <strong className="font-medium text-dark">Client time</strong> is when the device recorded the event;{" "}
              <strong className="font-medium text-dark">Server time</strong> is ingest time.{" "}
              <strong className="font-medium text-dark">Δ prev</strong> is the gap after the previous row in that session;{" "}
              <strong className="font-medium text-dark">From start</strong> is elapsed since the first event in the session.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
          >
            Back to admin
          </Link>
        </div>

        {serverError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{serverError}</div>
        ) : (
          <SalesMicroEventsTable initialSessions={initialSessions} />
        )}
      </section>
    </main>
  );
};

export default SalesAnalyticsAdminPage;
