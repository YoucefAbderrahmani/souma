import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import {
  dismissConceptionRecommendationById,
  listConceptionInboxForAdmin,
  markConceptionRecommendationImplemented,
} from "@/server/conception/conception-db";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const url = new URL(req.url);
    const roleKey = url.searchParams.get("roleKey")?.trim() || undefined;
    const inbox = await listConceptionInboxForAdmin({ limit: 40, roleKey });
    return NextResponse.json({ inbox });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/inbox GET]", e);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = (await req.json()) as { id?: unknown; action?: unknown };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const action = typeof body.action === "string" ? body.action.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "invalid_body", message: "Expected { id: string, action: string }" }, { status: 400 });
    }

    if (action === "implement") {
      const ok = await markConceptionRecommendationImplemented(id);
      if (!ok) {
        return NextResponse.json({ error: "not_found", message: "Inbox item not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, action: "implement" });
    }

    if (action === "dismiss") {
      const ok = await dismissConceptionRecommendationById(id);
      if (!ok) {
        return NextResponse.json({ error: "not_found", message: "Inbox item not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, action: "dismiss" });
    }

    return NextResponse.json(
      { error: "invalid_action", message: 'action must be "implement" or "dismiss".' },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/inbox PATCH]", e);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
