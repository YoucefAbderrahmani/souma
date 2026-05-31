import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi } from "@/server/lib/require-staff-api";
import {
  getConceptionAlertRuleSettings,
  saveConceptionAlertRuleSettings,
  settingsToAlertRules,
} from "@/server/conception/alert-rule-settings";
import type { ConceptionAlertRuleSettings } from "@/types/conception-admin";

export async function GET(req: NextRequest) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const settings = await getConceptionAlertRuleSettings();
    return NextResponse.json({
      ok: true,
      settings,
      rules: settingsToAlertRules(settings),
    });
  } catch (e) {
    console.error("[conception/alert-rules][GET]", e);
    return NextResponse.json({ error: "Failed to load alert rules." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const gate = await requireStaffApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const body = (await req.json()) as { settings?: Partial<ConceptionAlertRuleSettings> };
    if (!body.settings || typeof body.settings !== "object") {
      return NextResponse.json({ error: "settings object is required." }, { status: 400 });
    }
    const result = await saveConceptionAlertRuleSettings(body.settings as Partial<ConceptionAlertRuleSettings>);
    if (result.ok === false) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      settings: result.settings,
      rules: result.rules,
      updatedAt: result.updatedAt,
    });
  } catch (e) {
    console.error("[conception/alert-rules][PUT]", e);
    return NextResponse.json({ error: "Failed to save alert rules." }, { status: 500 });
  }
}
