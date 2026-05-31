import { NextResponse } from "next/server";
import { requireStaffApi } from "@/server/lib/require-staff-api";
import { listSequencesForAdmin, toShoppingSequenceDTOs } from "@/server/sequence/sequence-db";

export async function GET(req: Request) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const rows = await listSequencesForAdmin(500);
  return NextResponse.json({ sequences: toShoppingSequenceDTOs(rows) });
}
