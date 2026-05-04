import { NextResponse } from "next/server";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import {
  buildEnabledMap,
  getDisabledPaEventNames,
  setDisabledPaEventNames,
} from "@/server/product-analytics/tracking-config";
import { PA_EVENT_NAMES, isPaEventName } from "@/lib/pa-whitelist";

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const disabled = await getDisabledPaEventNames({ bypassCache: true });
    const disabledList = PA_EVENT_NAMES.filter((n) => disabled.has(n));
    return NextResponse.json({
      disabled: disabledList,
      enabled: buildEnabledMap(disabled),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[admin/product-analytics/tracking-config GET]", e);
    return NextResponse.json({ error: "database_error", message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const body = (await req.json()) as { disabled?: unknown };
    if (!Array.isArray(body.disabled)) {
      return NextResponse.json({ error: "invalid_body", detail: "Expected { disabled: string[] }" }, { status: 400 });
    }
    const invalid = body.disabled.filter((x) => typeof x !== "string" || !isPaEventName(x));
    if (invalid.length > 0) {
      return NextResponse.json({ error: "invalid_event_names", invalid }, { status: 400 });
    }
    await setDisabledPaEventNames(body.disabled as string[]);
    const disabled = await getDisabledPaEventNames({ bypassCache: true });
    return NextResponse.json({
      disabled: PA_EVENT_NAMES.filter((n) => disabled.has(n)),
      enabled: buildEnabledMap(disabled),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[admin/product-analytics/tracking-config PATCH]", e);
    return NextResponse.json({ error: "database_error", message }, { status: 500 });
  }
}
