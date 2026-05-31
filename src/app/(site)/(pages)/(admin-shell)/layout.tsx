import React from "react";
import AdminSideNav from "./admin/AdminSideNav";

/** Shared chrome for /admin (catalog & users). */
export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSideNav />
      <div className="lg:pl-64">{children}</div>
    </>
  );
}
