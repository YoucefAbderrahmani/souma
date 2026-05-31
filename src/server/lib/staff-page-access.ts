import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionAccess, type SessionAccess } from "@/server/lib/staff-access";

/** Redirects to sign-in if not authenticated; returns null if authenticated but not staff. */
export async function requireStaffPageAccess(): Promise<SessionAccess | null> {
  const access = await getSessionAccess(await headers());
  if (!access) {
    redirect("/signin");
  }
  return access.isStaff ? access : null;
}
