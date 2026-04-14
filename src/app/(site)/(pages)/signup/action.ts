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
  } catch (error: any) {
    if (error?.message?.toLowerCase()?.includes("duplicate")) {
      return { error: "Account already exists with this email or phone." };
    }
    // Handle thrown errors (network, unexpected, etc.)
    return { error: error?.message || "An unexpected error occurred" };
  }
});
