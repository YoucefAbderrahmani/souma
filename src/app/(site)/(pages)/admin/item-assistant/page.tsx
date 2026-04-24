import React from "react";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import ItemAssistantTable from "@/components/Admin/ItemAssistantTable";
import { listProductMicroAggregatesAdmin } from "@/server/sales-analyst/micro-events-by-product";
import type { ProductMicroAggregateRow } from "@/types/sales-micro-by-product";

export const metadata: Metadata = {
  title: "Item assistant | Souma Store Admin",
  description: "Per-product micro-interaction analytics across all shoppers",
};

const ItemAssistantPage = async () => {
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
            <h1 className="text-2xl font-semibold text-dark">Item assistant</h1>
            <p className="mt-3 text-dark-4">You do not have permission to access this page.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/my-account"
                className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
              >
                My account
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  let initialAggregates: ProductMicroAggregateRow[] = [];
  let serverError: string | null = null;
  try {
    initialAggregates = await listProductMicroAggregatesAdmin({ limit: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    serverError =
      message.includes("sales_micro_event") || message.includes("does not exist")
        ? 'Database is missing the "sales_micro_event" table. Run drizzle/0003_sales_micro_event.sql on Neon, then reload.'
        : message;
  }

  return (
    <main className="overflow-hidden pb-20 pt-40 sm:pt-44 lg:pt-36 xl:pt-45">
      <section className="max-w-[1200px] w-full mx-auto px-4 sm:px-8 xl:px-0">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-dark-4">Admin · Item assistant</p>
            <h1 className="text-2xl font-semibold text-dark">Store items & signals</h1>
            <p className="mt-1 max-w-3xl text-sm text-dark-4">
              Each row is one catalog product that has telemetry. Expand with the arrow to see averages (payload duration,
              time between signals) and every raw micro-event from all visitors for that SKU.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/ai-sales-analyst"
              className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
            >
              AI Sales Analyst (export)
            </Link>
            <Link
              href="/admin/sales-analytics"
              className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
            >
              Session timeline
            </Link>
            <Link
              href="/admin"
              className="rounded-md border border-gray-3 px-4 py-2 text-sm font-medium text-dark hover:border-[#FB923C] hover:text-[#FB923C]"
            >
              Admin home
            </Link>
          </div>
        </div>

        {serverError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{serverError}</div>
        ) : (
          <ItemAssistantTable initialAggregates={initialAggregates} />
        )}
      </section>
    </main>
  );
};

export default ItemAssistantPage;
