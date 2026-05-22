"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useSession } from "@/app/context/SessionProvider";
import { shouldShowAdminNav } from "@/lib/admin-nav";
import { SellerHelperLogo } from "@/components/SellerHelper/SellerHelperLogo";

const floatingLinkClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#FB923C] bg-white px-3 py-2.5 text-sm font-semibold text-[#FB923C] shadow-lg transition hover:bg-[#FB923C] hover:text-white sm:w-auto sm:justify-start";

/**
 * Fixed bottom-left entries for operators: Seller Helper (analytics dashboard) and Admin panel.
 */
export default function FloatingAdminButton() {
  const { session, isPending } = useSession();
  if (isPending || !session?.user || !shouldShowAdminNav(session.user)) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-4 z-[9980] flex flex-col gap-2 sm:bottom-6 sm:left-5">
      <Link href="/seller-helper" aria-label="Open Seller Helper dashboard" className={floatingLinkClass}>
        <SellerHelperLogo size={18} variant="mono" />
        Seller Helper
      </Link>
      <Link href="/admin" aria-label="Open admin panel" className={floatingLinkClass}>
        <Settings className="h-[18px] w-[18px] shrink-0" aria-hidden />
        Admin
      </Link>
    </div>
  );
}
