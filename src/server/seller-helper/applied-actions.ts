import { and, asc, eq, gte, inArray, isNull, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import { sellerHelperAppliedActionTable } from "@/server/db/schema";
import {
  APPLIED_ACTION_KIND_META,
  type AppliedActionDto,
  type AppliedActionKind,
} from "@/types/seller-helper-timeline";

const ALL_KINDS = Object.keys(APPLIED_ACTION_KIND_META) as AppliedActionKind[];

function isAppliedActionKind(value: string): value is AppliedActionKind {
  return (ALL_KINDS as string[]).includes(value);
}

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

export type LogAppliedActionInput = {
  kind: AppliedActionKind;
  title: string;
  summary?: string | null;
  productLocalId?: number | null;
  productTitle?: string | null;
  sourceRefId?: string | null;
  details?: Record<string, unknown> | null;
  occurredAt?: Date | null;
};

/**
 * Persists a single Seller Helper checkpoint. Errors are swallowed and logged
 * so callers (quick-fix actions, dismissals, …) never fail because of audit
 * write issues. The audit row is best-effort by design.
 */
export async function logAppliedAction(input: LogAppliedActionInput): Promise<void> {
  try {
    const titleTrim = input.title.trim().slice(0, 200);
    if (!titleTrim) return;
    const detailsJson =
      input.details && Object.keys(input.details).length > 0 ? JSON.stringify(input.details) : null;
    await db.insert(sellerHelperAppliedActionTable).values({
      kind: input.kind,
      title: titleTrim,
      summary: input.summary?.trim() ? input.summary.trim() : null,
      productLocalId:
        typeof input.productLocalId === "number" && Number.isFinite(input.productLocalId) ?
          Math.trunc(input.productLocalId)
        : null,
      productTitle: input.productTitle?.trim() ? input.productTitle.trim().slice(0, 200) : null,
      sourceRefId: input.sourceRefId?.trim() ? input.sourceRefId.trim().slice(0, 80) : null,
      detailsJson,
      occurredAt: input.occurredAt ?? new Date(),
    });
  } catch (error) {
    console.warn("[logAppliedAction] failed", error);
  }
}

export type ListAppliedActionsOptions = {
  start: Date;
  end: Date;
  /**
   * When set, includes actions tied to this product. By default also includes
   * store-wide actions (productLocalId IS NULL) — set `includeStoreWide` to
   * false to restrict to product-only rows.
   */
  productId?: number | null;
  includeStoreWide?: boolean;
  kinds?: AppliedActionKind[];
  limit?: number;
};

export async function listAppliedActionsInRange(
  options: ListAppliedActionsOptions
): Promise<AppliedActionDto[]> {
  const limit = Math.min(500, Math.max(1, options.limit ?? 200));
  const includeStoreWide = options.includeStoreWide !== false;

  const conditions: SQL[] = [
    gte(sellerHelperAppliedActionTable.occurredAt, options.start),
    lt(sellerHelperAppliedActionTable.occurredAt, options.end),
  ];

  if (options.kinds && options.kinds.length > 0) {
    conditions.push(inArray(sellerHelperAppliedActionTable.kind, options.kinds));
  }

  if (typeof options.productId === "number" && Number.isFinite(options.productId)) {
    const productCondition = eq(
      sellerHelperAppliedActionTable.productLocalId,
      Math.trunc(options.productId)
    );
    if (includeStoreWide) {
      const orClause = or(productCondition, isNull(sellerHelperAppliedActionTable.productLocalId));
      if (orClause) {
        conditions.push(orClause);
      }
    } else {
      conditions.push(productCondition);
    }
  }

  let rows: Array<typeof sellerHelperAppliedActionTable.$inferSelect>;
  try {
    rows = await db
      .select()
      .from(sellerHelperAppliedActionTable)
      .where(and(...conditions))
      .orderBy(asc(sellerHelperAppliedActionTable.occurredAt))
      .limit(limit);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Table not yet created (e.g. first dev run after pulling the feature).
    if (/seller_helper_applied_action/i.test(message) && /does not exist|relation/i.test(message)) {
      console.warn(
        "[listAppliedActionsInRange] seller_helper_applied_action table is missing — run `npm run db:ensure-seller-helper-applied-action` to enable Timeline checkpoints."
      );
      return [];
    }
    throw error;
  }

  return rows.map((row) => {
    const kind: AppliedActionKind = isAppliedActionKind(row.kind) ? row.kind : "ai_recommendation";
    const meta = APPLIED_ACTION_KIND_META[kind];
    return {
      id: row.id,
      kind,
      kindLabel: meta.label,
      title: row.title,
      summary: row.summary,
      occurredAt: row.occurredAt.toISOString(),
      productId: row.productLocalId,
      productTitle: row.productTitle,
      sourceRefId: row.sourceRefId,
      details: safeParseDetails(row.detailsJson),
    } satisfies AppliedActionDto;
  });
}
