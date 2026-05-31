import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { requireStaffPageAccess } from "@/server/lib/staff-page-access";
import ItemAssistantTable from "@/components/Admin/ItemAssistantTable";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { listProductMicroAggregatesAdmin } from "@/server/sales-analyst/micro-events-by-product";
import type { ProductMicroAggregateRow } from "@/types/sales-micro-by-product";

export const metadata: Metadata = {
  title: "Item assistant | Vitrina Store Admin",
  description: "Per-product micro-interaction analytics across all shoppers",
};

const ItemAssistantPage = async () => {
  const access = await requireStaffPageAccess();
  if (!access) {
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
    serverError = migrationHintFromDbMessage(message) ?? message;
  }

  return (
    <main className="overflow-hidden bg-[#fcfcfd] pb-20 pt-40 sm:pt-44 lg:pt-36 xl:pt-45">
      <section className="mx-auto w-full max-w-[1360px] px-4 sm:px-8 xl:px-10">
        <div className="mb-8 rounded-xl border border-gray-3 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm text-dark-4">Admin · Item assistant</p>
          <h1 className="mt-1 text-2xl font-semibold text-dark">Store items & signals</h1>
          <p className="mt-2 max-w-3xl text-sm text-dark-4">
            Each row is one catalog product that has telemetry. Expand with the arrow to see averages (payload duration,
            time between signals) and every raw micro-event from all visitors for that SKU.
          </p>
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
