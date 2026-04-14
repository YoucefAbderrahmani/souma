"use server";
import { validatedAction } from "@/server/lib/action-helpers";
import { auth } from "@/server/lib/auth";
import { UserPasswordChangeSchema } from "@/types/auth";
import { UserDataChangeSchema } from "@/types/user";
import { updateUserData as updateUserDataUseCase } from "@/use-cases/user";
import { headers } from "next/headers";
export const updateUserData = validatedAction(
  UserDataChangeSchema,
  async (data, formData) => {
    const { name, lastname, phone } = data;
    const userId = formData.get("userId") as string;

    try {
      const result = await updateUserDataUseCase({
        userId,
        name,
        lastname,
        phone,
      });

      if (!result.success) {
        return { error: result.error } as any;
      }

      return { success: true } as any;
    } catch (error: any) {
      // Handle thrown errors (network, unexpected, etc.)
      return { error: error?.message || "An unexpected error occurred" };
    }
  }
);

export const updateUserPassword = validatedAction(
  UserPasswordChangeSchema,
  async (data) => {
    const { newPassword, oldPassword } = data;
    // const userId = formData.get("userId") as string;

    try {
      const data = await auth.api.changePassword({
        body: {
          newPassword: newPassword, // required
          currentPassword: oldPassword, // required
          revokeOtherSessions: true,
        },
        // This endpoint requires session cookies.
        headers: await headers(),
      });

      if (!data) {
        return { error: "An unexpected error occurred" } as any;
      }
      return { success: true } as any;
    } catch (error: any) {
      // Handle thrown errors (network, unexpected, etc.)
      return { error: error?.message || "An unexpected error occurred" };
    }
  }
);
