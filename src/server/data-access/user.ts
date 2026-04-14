// Example: Replace with your actual user data access logic
import { db } from "@/server/db"; // adjust import to your db module
import { user } from "../db/schema";
import { eq } from "drizzle-orm"; // adjust import path if needed
import type { UserDataChangeSchema } from "@/types/user"; // adjust path if needed

export async function getUserLastNameById(userId: string): Promise<string> {
  // Replace with your actual query logic
  const result = await db
    .select({ lastname: user.lastname })
    .from(user)
    .where(eq(user.id, userId));
  return result[0]?.lastname ?? "";
}

export async function getUserImageById(userId: string): Promise<string> {
  const result = await db
    .select({ image: user.image })
    .from(user)
    .where(eq(user.id, userId));
  return result[0]?.image ?? "";
}

export async function getUserPhoneById(userId: string): Promise<string> {
  const result = await db
    .select({ phone: user.phone })
    .from(user)
    .where(eq(user.id, userId));
  return result[0]?.phone ?? "";
}

export async function setUserData(userData: {
  userId: string;
  name: string;
  lastname: string;
  phone: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db
      .update(user)
      .set({
        name: userData.name,
        lastname: userData.lastname,
        phone: userData.phone,
      })
      .where(eq(user.id, userData.userId));
    // You can check result for affected rows if your ORM supports it
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}
