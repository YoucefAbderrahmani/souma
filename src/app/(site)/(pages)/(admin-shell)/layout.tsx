import React from "react";
import { headers } from "next/headers";
import AdminSideNav from "./admin/AdminSideNav";
import { getSessionAccess } from "@/server/lib/staff-access";

/** Shared chrome for /admin (catalog & users). */
export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const access = await getSessionAccess(await headers());

  return (
    <>
      <AdminSideNav showRoleManagement={access?.isRoleAdmin ?? false} />
      <div className="lg:pl-64">{children}</div>
    </>
  );
}
