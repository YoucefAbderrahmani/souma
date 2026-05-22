import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { sellerHelperAppliedActionTable } from "@/server/db/schema";

export type VitrinaChokepointSnapshot = {
  jomlaPrice: number | null;
  description: string;
};

function safeParseDetails(json: string | null | undefined): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function readVitrinaChokepoint(details: Record<string, unknown>): VitrinaChokepointSnapshot | null {
  const raw = details.chokepointBefore;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const snap = raw as { jomlaPrice?: unknown; description?: unknown };
  const description = typeof snap.description === "string" ? snap.description : "";
  if (!description.trim()) return null;
  const jomlaPrice =
    snap.jomlaPrice === null || snap.jomlaPrice === undefined ?
      null
    : typeof snap.jomlaPrice === "number" && Number.isFinite(snap.jomlaPrice) ?
      snap.jomlaPrice
    : null;
  return { jomlaPrice, description };
}

function isVitrinaAuditMetaAction(details: Record<string, unknown>): boolean {
  return details.mode === "reset_default" || details.mode === "chokepoint";
}

/**
 * Earliest pre–quick-fix snapshot per DB product id (before the first Vitrina apply in the log).
 * Restoring this reverts default color order, promo price, merchandising fields, etc.
 */
export async function loadEarliestVitrinaChokepointsByProductDbId(): Promise<
  Map<string, VitrinaChokepointSnapshot>
> {
  const rows = await db
    .select({
      kind: sellerHelperAppliedActionTable.kind,
      detailsJson: sellerHelperAppliedActionTable.detailsJson,
      occurredAt: sellerHelperAppliedActionTable.occurredAt,
    })
    .from(sellerHelperAppliedActionTable)
    .where(eq(sellerHelperAppliedActionTable.kind, "vitrina_quick_fix"))
    .orderBy(asc(sellerHelperAppliedActionTable.occurredAt));

  const earliest = new Map<string, VitrinaChokepointSnapshot>();

  for (const row of rows) {
    const details = safeParseDetails(row.detailsJson);
    if (isVitrinaAuditMetaAction(details)) continue;

    const chokepoint = readVitrinaChokepoint(details);
    if (!chokepoint) continue;

    const productDbId =
      typeof details.productDbId === "string" ? details.productDbId.trim() : "";
    if (!productDbId || earliest.has(productDbId)) continue;

    earliest.set(productDbId, chokepoint);
  }

  return earliest;
}
