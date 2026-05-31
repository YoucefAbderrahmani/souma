import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi } from "@/server/lib/require-staff-api";
import {
  deleteRecommendationRoleEmail,
  listRecommendationRoleEmails,
  upsertRecommendationRoleEmail,
} from "@/server/conception/recommendation-role-emails-db";
import { normalizeRoleKey } from "@/lib/recommendation-roles";

export async function GET(req: NextRequest) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const roles = await listRecommendationRoleEmails();
    return NextResponse.json({ ok: true, roles });
  } catch (e) {
    console.error("[recommendation-role-emails][GET]", e);
    return NextResponse.json({ error: "Failed to load roles." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const body = (await req.json()) as {
      roleKey?: string;
      displayName?: string;
      email?: string;
    };
    const result = await upsertRecommendationRoleEmail({
      roleKey: body.roleKey ?? "",
      displayName: body.displayName ?? "",
      email: body.email ?? "",
    });
    if (result.ok === false) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const roles = await listRecommendationRoleEmails();
    return NextResponse.json({ ok: true, roles });
  } catch (e) {
    console.error("[recommendation-role-emails][POST]", e);
    return NextResponse.json({ error: "Failed to save role." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const roleKey = normalizeRoleKey(req.nextUrl.searchParams.get("roleKey") ?? "");
    if (!roleKey) {
      return NextResponse.json({ error: "roleKey is required." }, { status: 400 });
    }
    await deleteRecommendationRoleEmail(roleKey);
    const roles = await listRecommendationRoleEmails();
    return NextResponse.json({ ok: true, roles });
  } catch (e) {
    console.error("[recommendation-role-emails][DELETE]", e);
    return NextResponse.json({ error: "Failed to delete role." }, { status: 500 });
  }
}
