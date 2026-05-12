import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { conceptionSecurityBlockTable } from "@/server/db/schema";
import type { ConceptionSecurityQuickFixId } from "@/types/conception-admin";

const QUICK_FIX_IDS = new Set<ConceptionSecurityQuickFixId>(["block_session", "unblock_session"]);

export function parseSubmittedSecurityQuickFixes(rawFixes: string, rawFixIds: string) {
  if (rawFixes.trim()) {
    const parsed = JSON.parse(rawFixes) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const candidate = item as { id?: unknown; label?: unknown; summary?: unknown };
          if (!QUICK_FIX_IDS.has(candidate.id as ConceptionSecurityQuickFixId)) return null;
          return {
            id: candidate.id as ConceptionSecurityQuickFixId,
            label: String(candidate.label ?? "").trim(),
            summary: String(candidate.summary ?? "").trim(),
          };
        })
        .filter((item): item is { id: ConceptionSecurityQuickFixId; label: string; summary: string } => Boolean(item));
    }
  }

  const requestedFixIds = JSON.parse(rawFixIds) as unknown;
  if (!Array.isArray(requestedFixIds)) return [];
  return requestedFixIds
    .filter((id): id is ConceptionSecurityQuickFixId => QUICK_FIX_IDS.has(id as ConceptionSecurityQuickFixId))
    .map((id) => ({ id, label: id, summary: id }));
}

export async function applySecurityQuickFixes(
  sessionKey: string,
  reason: string,
  fixes: Array<{ id: ConceptionSecurityQuickFixId; summary: string }>
): Promise<{ applied: string[]; error?: string }> {
  const normalizedKey = sessionKey.trim().slice(0, 64);
  if (!normalizedKey) {
    return { applied: [], error: "Session introuvable." };
  }
  if (fixes.length === 0) {
    return { applied: [], error: "Aucune action sélectionnée." };
  }

  const applied: string[] = [];
  for (const fix of fixes) {
    if (fix.id === "block_session") {
      await db
        .insert(conceptionSecurityBlockTable)
        .values({
          sessionKey: normalizedKey,
          reason: reason.trim() || "Blocage manuel",
          source: "seller_helper",
        })
        .onConflictDoUpdate({
          target: conceptionSecurityBlockTable.sessionKey,
          set: {
            reason: reason.trim() || "Blocage manuel",
            blockedAt: new Date(),
            liftedAt: null,
            source: "seller_helper",
          },
        });
      applied.push(fix.summary);
      continue;
    }

    if (fix.id === "unblock_session") {
      await db
        .update(conceptionSecurityBlockTable)
        .set({ liftedAt: new Date() })
        .where(
          and(
            eq(conceptionSecurityBlockTable.sessionKey, normalizedKey),
            isNull(conceptionSecurityBlockTable.liftedAt)
          )
        );
      applied.push(fix.summary);
    }
  }

  if (applied.length === 0) {
    return { applied: [], error: "Aucune action n'a pu être appliquée." };
  }

  return { applied };
}

export async function getActiveBlockedSessionKeys(sessionKeys: string[]) {
  const uniqueKeys = Array.from(new Set(sessionKeys.map((key) => key.trim()).filter(Boolean)));
  if (uniqueKeys.length === 0) return new Set<string>();

  const rows = await db
    .select({ sessionKey: conceptionSecurityBlockTable.sessionKey })
    .from(conceptionSecurityBlockTable)
    .where(
      and(
        inArray(conceptionSecurityBlockTable.sessionKey, uniqueKeys),
        isNull(conceptionSecurityBlockTable.liftedAt)
      )
    );

  return new Set(rows.map((row) => row.sessionKey));
}
