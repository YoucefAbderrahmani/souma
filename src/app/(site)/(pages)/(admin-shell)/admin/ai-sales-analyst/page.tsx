import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaffPageAccess } from "@/server/lib/staff-page-access";

export default async function AiSalesAnalystAdminPage() {
  const access = await requireStaffPageAccess();
  if (!access) {
    return (
      <main className="overflow-hidden pb-20 pt-40 sm:pt-44 lg:pt-36 xl:pt-45">
        <section className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
          <div className="rounded-lg border border-gray-3 bg-white p-8 text-center">
            <h1 className="text-2xl font-semibold text-dark">AI Sales Analyst</h1>
            <p className="mt-3 text-dark-4">You do not have permission to access this page.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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

  redirect("/admin");
}
