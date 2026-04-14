import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { listSequencesForAdmin, toShoppingSequenceDTOs } from "@/server/sequence/sequence-db";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [current] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (current?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await listSequencesForAdmin(500);
  return NextResponse.json({ sequences: toShoppingSequenceDTOs(rows) });
}
