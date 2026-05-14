"use server";
import { validatedAction } from "@/server/lib/action-helpers";
import { auth } from "@/server/lib/auth";
import { LoginSchema } from "@/types/auth";
import { headers } from "next/headers";

export const loginEmail = validatedAction(LoginSchema, async (data) => {
  const { email, password } = data;

  try {
    // Do not use `asResponse: true` — it prevents nextCookies() from applying session cookies from server actions.
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    const lower = message.toLowerCase();
    if (
      lower.includes("invalid email or password") ||
      lower.includes("invalid_email_or_password") ||
      (lower.includes("credential") && lower.includes("not found"))
    ) {
      return { error: "Invalid email or password" };
    }
    if (
      lower.includes("exceeded the data transfer quota") ||
      lower.includes("data transfer quota") ||
      lower.includes("upgrade your plan to increase limits")
    ) {
      return {
        error:
          "Sign-in is unavailable: the database hit its transfer limit. Upgrade your Neon plan or try again after the quota resets.",
      };
    }
    return { error: message || "An unexpected error occurred" };
  }
});
