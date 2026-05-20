import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { recommendationRoleEmailTable } from "@/server/db/schema";
import {
  DEFAULT_RECOMMENDATION_ROLE_DEFINITIONS,
  isValidEmail,
  isValidRoleKey,
  normalizeRoleKey,
} from "@/lib/recommendation-roles";

export type RecommendationRoleEmailRow = {
  roleKey: string;
  displayName: string;
  email: string;
  updatedAt: string;
};

export async function ensureDefaultRecommendationRoles() {
  for (const def of DEFAULT_RECOMMENDATION_ROLE_DEFINITIONS) {
    await db
      .insert(recommendationRoleEmailTable)
      .values({
        roleKey: def.roleKey,
        displayName: def.displayName,
        email: "",
      })
      .onConflictDoNothing();
  }
}

export async function listRecommendationRoleEmails(): Promise<RecommendationRoleEmailRow[]> {
  await ensureDefaultRecommendationRoles();
  const rows = await db.select().from(recommendationRoleEmailTable);
  return rows
    .map((r) => ({
      roleKey: r.roleKey,
      displayName: r.displayName,
      email: r.email.trim(),
      updatedAt: r.updatedAt.toISOString(),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function upsertRecommendationRoleEmail(input: {
  roleKey: string;
  displayName: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const roleKey = normalizeRoleKey(input.roleKey);
  const displayName = input.displayName.trim().slice(0, 120);
  const email = input.email.trim().toLowerCase().slice(0, 255);

  if (!isValidRoleKey(roleKey)) {
    return { ok: false, error: "Invalid role key (use letters, numbers, underscores)." };
  }
  if (!displayName) return { ok: false, error: "Display name is required." };
  if (!isValidEmail(email)) return { ok: false, error: "Valid email address is required." };

  await db
    .insert(recommendationRoleEmailTable)
    .values({ roleKey, displayName, email, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: recommendationRoleEmailTable.roleKey,
      set: { displayName, email, updatedAt: new Date() },
    });

  return { ok: true };
}

export async function deleteRecommendationRoleEmail(roleKey: string): Promise<boolean> {
  const key = normalizeRoleKey(roleKey);
  const result = await db
    .delete(recommendationRoleEmailTable)
    .where(eq(recommendationRoleEmailTable.roleKey, key))
    .returning({ roleKey: recommendationRoleEmailTable.roleKey });
  return result.length > 0;
}

export async function getRoleEmailMap(): Promise<
  Map<string, { displayName: string; email: string }>
> {
  const rows = await listRecommendationRoleEmails();
  const map = new Map<string, { displayName: string; email: string }>();
  for (const row of rows) {
    map.set(row.roleKey, { displayName: row.displayName, email: row.email });
  }
  return map;
}

export async function getRoleDefinitionList() {
  const rows = await listRecommendationRoleEmails();
  return rows.map((r) => ({ roleKey: r.roleKey, displayName: r.displayName }));
}

export function registeredRoleKeysFromMap(map: Map<string, unknown>): string[] {
  return Array.from(map.keys());
}
