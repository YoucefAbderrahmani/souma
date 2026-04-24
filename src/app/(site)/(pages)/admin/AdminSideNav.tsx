"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function linkClass(isActive: boolean): string {
  return isActive
    ? "block w-full rounded-lg bg-blue px-3 py-2 text-sm font-medium text-white shadow-sm"
    : "block w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm font-medium text-dark transition hover:border-[#FB923C] hover:text-[#FB923C]";
}

export default function AdminSideNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  const onAdminHome = pathname === "/admin";

  return (
    <aside className="hidden lg:block fixed left-0 top-40 z-40 h-[calc(100vh-10rem)] w-64 overflow-y-auto border-r border-gray-3 bg-[#fcfcfd] px-4 py-5">
      <p className="text-xs font-medium uppercase tracking-wide text-dark-4">Admin navigation</p>

      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-4">Seller</p>
        <Link href="/admin?tab=users" className={linkClass(onAdminHome && (!tab || tab === "users"))}>
          Users
        </Link>
        <Link href="/admin?tab=add-product" className={linkClass(onAdminHome && tab === "add-product")}>
          Add Items
        </Link>
        <Link href="/admin?tab=products" className={linkClass(onAdminHome && tab === "products")}>
          Stock & Edit Items
        </Link>
      </div>

      <div className="mt-5 space-y-2 border-t border-gray-2 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-4">Data Tracking</p>
        <Link href="/sequence" className={linkClass(pathname === "/sequence")}>
          Sequences
        </Link>
        <Link href="/admin/item-assistant" className={linkClass(pathname === "/admin/item-assistant")}>
          Item Assistant Tracking
        </Link>
        <Link href="/admin/sales-analytics" className={linkClass(pathname === "/admin/sales-analytics")}>
          Session Timeline
        </Link>
        <Link href="/admin/ai-sales-analyst" className={linkClass(pathname === "/admin/ai-sales-analyst")}>
          AI Sales Analyst
        </Link>
      </div>
    </aside>
  );
}

