import React from "react";
import AdminSideNav from "../admin/AdminSideNav";

export default function SequenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSideNav />
      <div className="lg:pl-64">{children}</div>
    </>
  );
}

