import { eq } from "drizzle-orm";
import { auth } from "@/server/lib/auth";
import { isStaffRole } from "@/lib/user-roles";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

/** Admin panel + Seller Helper APIs: `admin`, `seller`, or privileged operator email. */
export async function requireStaffApi(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  const [current] = await db
    .select({ role: user.role, email: user.email })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (!isStaffRole(current?.role, current?.email ?? session.user.email)) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }
  return { ok: true as const, session, role: current?.role ?? "user" };
}
