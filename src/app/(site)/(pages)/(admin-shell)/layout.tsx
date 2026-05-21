import React from "react";
import AdminSideNav from "./admin/AdminSideNav";

/** Shared chrome for /admin, /sequence, and other admin data-tracking pages. */
export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSideNav />
      <div className="lg:pl-64">{children}</div>
    </>
  );
}
