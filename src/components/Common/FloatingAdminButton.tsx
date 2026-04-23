"use client";

import Link from "next/link";
import { useSession } from "@/app/context/SessionProvider";
import { shouldShowAdminNav } from "@/lib/admin-nav";

/**
 * Fixed bottom-left entry to the admin panel for operators (role or allowlisted email).
 */
export default function FloatingAdminButton() {
  const { session, isPending } = useSession();
  if (isPending || !session?.user || !shouldShowAdminNav(session.user)) {
    return null;
  }

  return (
    <Link
      href="/admin"
      aria-label="Open admin panel"
      className="fixed bottom-5 left-4 z-[9980] inline-flex items-center gap-2 rounded-lg border border-[#FB923C] bg-white px-3 py-2.5 text-sm font-semibold text-[#FB923C] shadow-lg transition hover:bg-[#FB923C] hover:text-white sm:bottom-6 sm:left-5"
    >
      <svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M11 2.0625L3.4375 5.5V10.3125C3.4375 14.7839 6.70586 18.8798 11 19.9375C15.2941 18.8798 18.5625 14.7839 18.5625 10.3125V5.5L11 2.0625Z"
          fill="currentColor"
        />
      </svg>
      Admin
    </Link>
  );
}
