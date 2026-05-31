import { isPrivilegedAdminEmail } from "@/lib/privileged-admin-emails";

export const USER_ROLES = ["user", "seller", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function normalizeUserRole(role: string | null | undefined): UserRole {
  if (role === "admin" || role === "seller") return role;
  return "user";
}

/** Full admin: role `admin` or legacy privileged operator email. */
export function isAdminRole(
  role: string | null | undefined,
  email?: string | null
): boolean {
  if (normalizeUserRole(role) === "admin") return true;
  return isPrivilegedAdminEmail(email);
}

/** Store staff: admin or seller (Seller Helper + admin panel). */
export function isStaffRole(
  role: string | null | undefined,
  email?: string | null
): boolean {
  if (isAdminRole(role, email)) return true;
  return normalizeUserRole(role) === "seller";
}

/** Only admins may open the role-management tab and assign roles. */
export function canManageUserRoles(
  role: string | null | undefined,
  email?: string | null
): boolean {
  return isAdminRole(role, email);
}

/** Whether `actor` may set `targetUser` to `nextRole`. Sellers cannot use this API at all. */
export function canAssignUserRole(options: {
  actorRole: string | null | undefined;
  actorEmail?: string | null;
  targetEmail?: string | null;
  nextRole: UserRole;
}): boolean {
  const { actorRole, actorEmail, targetEmail, nextRole } = options;
  if (!canManageUserRoles(actorRole, actorEmail)) return false;
  if (isPrivilegedAdminEmail(targetEmail)) return false;
  if (nextRole === "admin") {
    return isPrivilegedAdminEmail(actorEmail);
  }
  return nextRole === "user" || nextRole === "seller";
}

export function roleDisplayLabel(role: string | null | undefined): string {
  const r = normalizeUserRole(role);
  if (r === "admin") return "Admin";
  if (r === "seller") return "Seller";
  return "User";
}
