import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { userCartTable } from "@/server/db/schema";
import type { CartItem } from "@/redux/features/cart-slice";

function parseCartItems(raw: string): CartItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

export async function getUserCartItems(userId: string): Promise<CartItem[]> {
  const [row] = await db
    .select({ itemsJson: userCartTable.itemsJson })
    .from(userCartTable)
    .where(eq(userCartTable.userId, userId))
    .limit(1);
  if (!row) return [];
  return parseCartItems(row.itemsJson);
}

export async function saveUserCartItems(userId: string, items: CartItem[]): Promise<void> {
  const itemsJson = JSON.stringify(items);
  const now = new Date();
  await db
    .insert(userCartTable)
    .values({ userId, itemsJson, updatedAt: now })
    .onConflictDoUpdate({
      target: userCartTable.userId,
      set: { itemsJson, updatedAt: now },
    });
}
