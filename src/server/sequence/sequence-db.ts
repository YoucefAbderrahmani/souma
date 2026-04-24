import { and, desc, eq, getTableColumns, inArray, isNotNull } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "@/server/db";
import { shoppingSequenceTable, user } from "@/server/db/schema";
import type { ShoppingSequenceDTO } from "@/types/shopping-sequence";

export type ShoppingSequenceRow = InferSelectModel<typeof shoppingSequenceTable>;

export type SequenceAdminListRow = ShoppingSequenceRow & {
  viewerName: string | null;
  viewerLastname: string | null;
  viewerEmail: string | null;
};

function userDisplayNameForRow(r: SequenceAdminListRow): string {
  if (!r.userId) return "—";
  const full = `${r.viewerName ?? ""} ${r.viewerLastname ?? ""}`.trim();
  if (full) return full;
  if (r.viewerEmail) return r.viewerEmail;
  return r.userId;
}

export function toShoppingSequenceDTOs(rows: SequenceAdminListRow[]): ShoppingSequenceDTO[] {
  return rows.map((r) => ({
    id: r.id,
    sessionKey: r.sessionKey,
    userId: r.userId,
    userDisplayName: userDisplayNameForRow(r),
    triggerType: r.triggerType,
    triggerLabel: r.triggerLabel,
    status: r.status,
    productVisitedAt: r.productVisitedAt ? r.productVisitedAt.toISOString() : null,
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt ? r.endedAt.toISOString() : null,
  }));
}

export type SequenceTriggerType = "search" | "category" | "product";

const ACTIVE = "active";
const SUPERSEDED = "superseded";
const ENDED_LEFT = "ended_left";
const ENDED_PURCHASE = "ended_purchase";

export async function supersedeActiveAndInsertSequence(params: {
  sessionKey: string;
  userId: string | null;
  triggerType: SequenceTriggerType;
  triggerLabel: string;
}) {
  await db
    .update(shoppingSequenceTable)
    .set({ status: SUPERSEDED, endedAt: new Date() })
    .where(
      and(eq(shoppingSequenceTable.sessionKey, params.sessionKey), eq(shoppingSequenceTable.status, ACTIVE))
    );

  await db.insert(shoppingSequenceTable).values({
    sessionKey: params.sessionKey,
    userId: params.userId,
    triggerType: params.triggerType,
    triggerLabel: params.triggerLabel.slice(0, 2000),
    status: ACTIVE,
  });
}

export async function markProductVisited(sessionKey: string) {
  await db
    .update(shoppingSequenceTable)
    .set({ productVisitedAt: new Date() })
    .where(
      and(eq(shoppingSequenceTable.sessionKey, sessionKey), eq(shoppingSequenceTable.status, ACTIVE))
    );
}

export async function endActiveSequence(sessionKey: string, reason: "leave" | "purchase") {
  const status = reason === "purchase" ? ENDED_PURCHASE : ENDED_LEFT;
  await db
    .update(shoppingSequenceTable)
    .set({ status, endedAt: new Date() })
    .where(
      and(
        eq(shoppingSequenceTable.sessionKey, sessionKey),
        eq(shoppingSequenceTable.status, ACTIVE)
      )
    );
}

/** Only close if shopper reached a product page (per business rules). */
export async function endActiveSequenceIfVisitedProduct(
  sessionKey: string,
  reason: "leave" | "purchase"
) {
  const status = reason === "purchase" ? ENDED_PURCHASE : ENDED_LEFT;
  await db
    .update(shoppingSequenceTable)
    .set({ status, endedAt: new Date() })
    .where(
      and(
        eq(shoppingSequenceTable.sessionKey, sessionKey),
        eq(shoppingSequenceTable.status, ACTIVE),
        isNotNull(shoppingSequenceTable.productVisitedAt)
      )
    );
}

export async function listSequencesForAdmin(limit = 500) {
  return db
    .select({
      ...getTableColumns(shoppingSequenceTable),
      viewerName: user.name,
      viewerLastname: user.lastname,
      viewerEmail: user.email,
    })
    .from(shoppingSequenceTable)
    .leftJoin(user, eq(shoppingSequenceTable.userId, user.id))
    .orderBy(desc(shoppingSequenceTable.startedAt))
    .limit(limit);
}

/** All funnel rows for the given session keys (for correlating micro-events to sequence windows). */
export async function listSequencesForSessionKeys(sessionKeys: string[]): Promise<ShoppingSequenceRow[]> {
  const unique = Array.from(new Set(sessionKeys)).filter((k) => k.length >= 8);
  if (unique.length === 0) return [];
  return db
    .select()
    .from(shoppingSequenceTable)
    .where(inArray(shoppingSequenceTable.sessionKey, unique))
    .orderBy(shoppingSequenceTable.startedAt);
}
