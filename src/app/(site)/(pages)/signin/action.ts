"use server";
import { validatedAction } from "@/server/lib/action-helpers";
import { auth } from "@/server/lib/auth";
import { LoginSchema } from "@/types/auth";
import { headers } from "next/headers";

export const loginEmail = validatedAction(LoginSchema, async (data) => {
  const { email, password } = data;

  try {
    const result = await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
      asResponse: true,
    });

    if (result.status >= 400) {
      if (result.status === 401) {
        return { error: "Invalid email or password" };
      }

      return {
        error: result.statusText || "Unable to sign in. Please try again.",
      } as any;
    }

    return { success: true };
  } catch (error: any) {
    // Handle thrown errors (network, unexpected, etc.)
    return { error: error?.message || "An unexpected error occurred" };
  }
});
