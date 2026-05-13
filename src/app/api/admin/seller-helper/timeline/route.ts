import { NextResponse } from "next/server";
import { migrationHintFromDbMessage } from "@/lib/db-error-migration-hint";
import { requireAdminApi } from "@/server/lib/require-admin-api";
import { buildTimelineSeries } from "@/server/seller-helper/timeline-series";
import {
  TIMELINE_METRIC_IDS,
  TIMELINE_RANGE_IDS,
  type TimelineMetricId,
  type TimelineRangeId,
  type TimelineScope,
} from "@/types/seller-helper-timeline";

export const dynamic = "force-dynamic";

function parseRange(value: string | null): TimelineRangeId {
  if (value && (TIMELINE_RANGE_IDS as string[]).includes(value)) {
    return value as TimelineRangeId;
  }
  return "24h";
}

function parseScope(value: string | null): TimelineScope {
  return value === "product" ? "product" : "store";
}

function parseMetrics(value: string | null): TimelineMetricId[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is TimelineMetricId =>
      (TIMELINE_METRIC_IDS as string[]).includes(entry)
    );
}

function parseProductId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

export async function GET(req: Request) {
  const gate = await requireAdminApi(req);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const url = new URL(req.url);
    const range = parseRange(url.searchParams.get("range"));
    const scope = parseScope(url.searchParams.get("scope"));
    const metrics = parseMetrics(url.searchParams.get("metrics"));
    const productId = parseProductId(url.searchParams.get("productId"));

    if (scope === "product" && !productId) {
      return NextResponse.json(
        {
          error: "invalid_query",
          message: "Expected productId when scope=product.",
        },
        { status: 400 }
      );
    }

    const timeline = await buildTimelineSeries({ range, scope, productId, metrics });
    return NextResponse.json({ timeline });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[seller-helper/timeline]", error);
    return NextResponse.json(
      {
        error: "database_error",
        message: migrationHintFromDbMessage(message) ?? message,
      },
      { status: 500 }
    );
  }
}
