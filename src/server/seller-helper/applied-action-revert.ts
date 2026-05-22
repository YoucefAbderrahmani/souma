import { and, eq, isNull } from "drizzle-orm";
import { parseProductContent, serializeProductContent } from "@/lib/product-content";
import {
  VITRINA_MERCH_KEYS,
  VITRINA_QUICK_FIX_INFO_KEYS,
  isVitrinaMerchandisingKey,
} from "@/lib/vitrina-merchandising";
import { db } from "@/server/db";
import { conceptionSecurityBlockTable, productsTable, sellerHelperAppliedActionTable } from "@/server/db/schema";
import {
  resolveDatabaseProductIdFromClientProductId,
  resolveStorefrontProductId,
} from "@/server/data-access/product-catalog";
import { logAppliedAction } from "@/server/seller-helper/applied-actions";
import { revalidateStorefrontCatalogPaths } from "@/server/revalidate-storefront-catalog";
import { refreshVitrinaRecommendationInCache } from "@/server/seller-helper/vitrina-recommendations-cache";
import type { AppliedActionKind } from "@/types/seller-helper-timeline";

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

function readChokepoint(details: Record<string, unknown>): VitrinaChokepointSnapshot | null {
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

export async function getAppliedActionRowById(actionId: string) {
  const [row] = await db
    .select()
    .from(sellerHelperAppliedActionTable)
    .where(eq(sellerHelperAppliedActionTable.id, actionId))
    .limit(1);
  return row ?? null;
}

export async function revertAppliedActionToChokepoint(actionId: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const row = await getAppliedActionRowById(actionId);
  if (!row) return { ok: false, message: "Log entry not found." };

  const kind = row.kind as AppliedActionKind;
  const details = safeParseDetails(row.detailsJson);

  if (kind === "vitrina_quick_fix") {
    const chokepoint = readChokepoint(details);
    if (!chokepoint) {
      return {
        ok: false,
        message: "No chokepoint snapshot for this entry. Use Reset to default instead.",
      };
    }

    const productDbId =
      typeof details.productDbId === "string" ? details.productDbId.trim() : "";
    if (!productDbId) {
      return { ok: false, message: "Product reference missing from this log entry." };
    }

    await db
      .update(productsTable)
      .set({
        jomlaPrice: chokepoint.jomlaPrice,
        description: chokepoint.description,
      })
      .where(eq(productsTable.id, productDbId));

    revalidateStorefrontCatalogPaths();
    const clientId =
      typeof details.productLocalId === "number" ? String(details.productLocalId) : row.sourceRefId ?? "";
    if (clientId) {
      await refreshVitrinaRecommendationInCache(productDbId, clientId !== productDbId ? [clientId] : undefined);
    }

    await logAppliedAction({
      kind: "vitrina_quick_fix",
      title: `Reverted to chokepoint · ${row.productTitle ?? "product"}`,
      summary: `Restored catalogue state from before “${row.title}”.`,
      productLocalId: row.productLocalId,
      productTitle: row.productTitle,
      sourceRefId: row.sourceRefId,
      details: { revertedActionId: actionId, mode: "chokepoint" },
    });

    return { ok: true, message: "Product restored to the state before this change." };
  }

  if (kind === "security_block") {
    const sessionKey =
      typeof details.sessionKey === "string" ? details.sessionKey.trim() : row.sourceRefId?.trim();
    if (!sessionKey) return { ok: false, message: "Session key missing from this log entry." };

    await db
      .update(conceptionSecurityBlockTable)
      .set({ liftedAt: new Date() })
      .where(
        and(
          eq(conceptionSecurityBlockTable.sessionKey, sessionKey),
          isNull(conceptionSecurityBlockTable.liftedAt)
        )
      );

    await logAppliedAction({
      kind: "security_unblock",
      title: `Reverted block · ${sessionKey.slice(0, 12)}…`,
      summary: "Session unblocked (undo of security block).",
      sourceRefId: sessionKey,
      details: { revertedActionId: actionId, mode: "chokepoint" },
    });

    return { ok: true, message: "Session unblocked (block reverted)." };
  }

  if (kind === "security_unblock") {
    const sessionKey =
      typeof details.sessionKey === "string" ? details.sessionKey.trim() : row.sourceRefId?.trim();
    const reason =
      typeof details.reason === "string" && details.reason.trim() ?
        details.reason.trim()
      : "Re-applied after reverting unblock";
    if (!sessionKey) return { ok: false, message: "Session key missing from this log entry." };

    await db
      .insert(conceptionSecurityBlockTable)
      .values({
        sessionKey,
        reason,
        source: "seller_helper_revert",
      })
      .onConflictDoUpdate({
        target: conceptionSecurityBlockTable.sessionKey,
        set: {
          reason,
          blockedAt: new Date(),
          liftedAt: null,
          source: "seller_helper_revert",
        },
      });

    await logAppliedAction({
      kind: "security_block",
      title: `Reverted unblock · ${sessionKey.slice(0, 12)}…`,
      summary: reason,
      sourceRefId: sessionKey,
      details: { revertedActionId: actionId, mode: "chokepoint" },
    });

    return { ok: true, message: "Session blocked again (unblock reverted)." };
  }

  return {
    ok: false,
    message: "This log type cannot be reverted automatically. Use the revert email for recommendations.",
  };
}

export async function resetVitrinaProductToDefault(options: {
  actionId?: string;
  productLocalId?: number;
  sourceRefId?: string;
}): Promise<{ ok: boolean; message: string }> {
  let productLocalId = options.productLocalId;
  let productTitle: string | null = null;
  let sourceRefId = options.sourceRefId ?? null;

  if (options.actionId) {
    const row = await getAppliedActionRowById(options.actionId);
    if (!row || row.kind !== "vitrina_quick_fix") {
      return { ok: false, message: "Only Vitrina quick-fix entries can be reset to default." };
    }
    productLocalId = row.productLocalId ?? undefined;
    productTitle = row.productTitle;
    sourceRefId = row.sourceRefId;
  }

  if (!productLocalId && sourceRefId) {
    const dbId = await resolveDatabaseProductIdFromClientProductId(sourceRefId);
    if (dbId) {
      productLocalId = resolveStorefrontProductId(productTitle ?? "", dbId);
    }
  }

  if (!productLocalId || productLocalId <= 0) {
    return { ok: false, message: "Product not specified." };
  }

  const dbProductId = await resolveDatabaseProductIdFromClientProductId(String(productLocalId));
  if (!dbProductId) {
    return { ok: false, message: "Could not resolve product in the database." };
  }

  const [product] = await db
    .select({
      id: productsTable.id,
      title: productsTable.title,
      description: productsTable.description,
      jomlaPrice: productsTable.jomlaPrice,
    })
    .from(productsTable)
    .where(eq(productsTable.id, dbProductId))
    .limit(1);

  if (!product) return { ok: false, message: "Product not found." };

  const content = parseProductContent(product.description);
  const stripKeys = new Set<string>([
    VITRINA_MERCH_KEYS.trendingCountdown,
    VITRINA_MERCH_KEYS.heroReview,
    VITRINA_QUICK_FIX_INFO_KEYS.availability,
    VITRINA_QUICK_FIX_INFO_KEYS.quality,
  ]);

  const nextAdditionalInfo = content.additionalInfo.filter(
    (entry) => !stripKeys.has(entry.key) && !isVitrinaMerchandisingKey(entry.key)
  );

  const nextDescription = serializeProductContent({
    ...content,
    additionalInfo: nextAdditionalInfo,
  });

  await db
    .update(productsTable)
    .set({
      jomlaPrice: null,
      description: nextDescription,
    })
    .where(eq(productsTable.id, dbProductId));

  revalidateStorefrontCatalogPaths();
  await refreshVitrinaRecommendationInCache(
    dbProductId,
    String(productLocalId) !== dbProductId ? [String(productLocalId)] : undefined
  );

  await logAppliedAction({
    kind: "vitrina_quick_fix",
    title: `Reset to default · ${product.title}`,
    summary: "Removed Vitrina promo price and merchandising quick-fix fields.",
    productLocalId: Math.trunc(productLocalId),
    productTitle: product.title,
    sourceRefId: sourceRefId ?? String(productLocalId),
    details: {
      productDbId: dbProductId,
      mode: "reset_default",
      revertedActionId: options.actionId ?? null,
    },
  });

  return { ok: true, message: "Vitrina merchandising cleared and promo price removed." };
}
