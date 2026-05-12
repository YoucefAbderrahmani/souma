import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import {
  dismissConceptionAlertById,
  listConceptionAlertsForAdmin,
  listDismissedConceptionAlertsForAdmin,
  type ConceptionAlertDisposition,
} from "@/server/conception/conception-db";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const [alerts, resolvedAlerts] = await Promise.all([
      listConceptionAlertsForAdmin({ limit: 50 }),
      listDismissedConceptionAlertsForAdmin({ limit: 12 }),
    ]);
    return NextResponse.json({ alerts, resolvedAlerts });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/alerts]", e);
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
    const body = (await req.json()) as { id?: unknown; disposition?: unknown };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "invalid_body", message: "Expected { id: string }" }, { status: 400 });
    }

    const disposition: ConceptionAlertDisposition =
      body.disposition === "ignored" ? "ignored" : "resolved";

    const dismissed = await dismissConceptionAlertById(id, disposition);
    if (!dismissed) {
      return NextResponse.json({ error: "not_found", message: "Alert not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[conception/alerts PATCH]", e);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
