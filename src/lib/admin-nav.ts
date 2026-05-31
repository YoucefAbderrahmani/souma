import { isStaffRole } from "@/lib/user-roles";

/**
 * Client-side hint for admin / Seller Helper navigation.
 * Server routes enforce staff (`admin` | `seller`) or privileged operator email.
 */
export function shouldShowAdminNav(
  user: { role?: string; email?: string | null } | undefined
): boolean {
  if (!user) return false;
  return isStaffRole(user.role, user.email);
}

/** @deprecated Use shouldShowAdminNav — kept for existing imports. */
export const shouldShowStaffNav = shouldShowAdminNav;
