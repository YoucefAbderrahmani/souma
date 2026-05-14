"use server";
import { validatedAction } from "@/server/lib/action-helpers";
import { auth } from "@/server/lib/auth";
import { SignUpSchema } from "@/types/auth";
import { headers } from "next/headers";

export const signUpEmail = validatedAction(SignUpSchema, async (data) => {
  const { name, lastname, phone, email, password } = data;

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
        lastname,
        phone,
      },
      headers: await headers(),
    });

    if (!result) {
      return { error: "Unable to create account. Please try again." } as any;
    }

    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error ?? "");
    const lower = message.toLowerCase();
    if (
      lower.includes("exceeded the data transfer quota") ||
      lower.includes("data transfer quota") ||
      lower.includes("upgrade your plan to increase limits")
    ) {
      return {
        error:
          "Sign-up is unavailable: the database hit its transfer limit. Upgrade your Neon plan or try again after the quota resets.",
      } as any;
    }
    if (lower.includes("duplicate")) {
      return { error: "Account already exists with this email or phone." };
    }
    return { error: message || "An unexpected error occurred" } as any;
  }
});
