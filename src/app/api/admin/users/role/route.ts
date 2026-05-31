import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  USER_ROLES,
  canAssignUserRole,
  normalizeUserRole,
  type UserRole,
} from "@/lib/user-roles";
import { isPrivilegedAdminEmail } from "@/lib/privileged-admin-emails";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

const bodySchema = z.object({
  userId: z.string().min(1),
  role: z.enum(USER_ROLES),
});

export async function PATCH(req: NextRequest) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { userId, role: nextRole } = parsed.data;

  if (userId === gate.session.user.id && nextRole !== "admin") {
    const [self] = await db
      .select({ role: user.role, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (isPrivilegedAdminEmail(self?.email) || normalizeUserRole(self?.role) === "admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin access." },
        { status: 400 }
      );
    }
  }

  const [target] = await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [actor] = await db
    .select({ role: user.role, email: user.email })
    .from(user)
    .where(eq(user.id, gate.session.user.id))
    .limit(1);

  if (
    !canAssignUserRole({
      actorRole: actor?.role,
      actorEmail: actor?.email ?? gate.session.user.email,
      targetEmail: target.email,
      nextRole: nextRole as UserRole,
    })
  ) {
    return NextResponse.json(
      { error: "Forbidden: sellers cannot assign roles; only admins can, and admin role requires a privileged operator." },
      { status: 403 }
    );
  }

  await db
    .update(user)
    .set({ role: nextRole, updatedAt: new Date() })
    .where(eq(user.id, userId));

  return NextResponse.json({
    ok: true,
    userId,
    role: nextRole,
  });
}
