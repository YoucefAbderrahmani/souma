import { eq } from "drizzle-orm";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import {
  canManageUserRoles,
  isAdminRole,
  isStaffRole,
  normalizeUserRole,
  type UserRole,
} from "@/lib/user-roles";

export type SessionAccess = {
  userId: string;
  email: string;
  role: UserRole;
  isStaff: boolean;
  isRoleAdmin: boolean;
};

export async function getSessionAccess(headers: Headers): Promise<SessionAccess | null> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) return null;

  const [row] = await db
    .select({ role: user.role, email: user.email })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const email = row?.email ?? session.user.email ?? "";
  const sessionRole =
    typeof session.user === "object" && session.user && "role" in session.user
      ? String((session.user as { role?: string }).role ?? "")
      : "";
  const role = normalizeUserRole(row?.role ?? sessionRole);

  return {
    userId: session.user.id,
    email,
    role,
    isStaff: isStaffRole(role, email),
    isRoleAdmin: canManageUserRoles(role, email),
  };
}
