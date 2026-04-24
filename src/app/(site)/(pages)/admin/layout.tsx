import React from "react";
import AdminSideNav from "./AdminSideNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSideNav />
      <div className="lg:pl-64">{children}</div>
    </>
  );
}

