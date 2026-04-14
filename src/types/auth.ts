import { z } from "zod";

export const SignUpSchema = z
  .object({
    email: z.email({
      error: "Invalid email address",
    }),
    password: z.string().min(8, {
      error: "Password must be at least 8 characters",
    }),
    retypePassword: z.string().min(8, {
      error: "Password must be at least 8 characters",
    }),
    name: z.string().min(2, { error: "Name is required" }),
    lastname: z.string().min(2, {
      error: "Lastname is required",
    }),
    phone: z.string().min(10, { error: "Phone is required" }).max(10),
  })
  .refine((data) => data.password === data.retypePassword, {
    error: "Passwords do not match",
    path: ["retypePassword"],
  });

export const LoginSchema = z.object({
  email: z.email("Password or email is incorrect"),
  password: z.string().min(8, "Password or email is incorrect"),
});
export const UserPasswordChangeSchema = z
  .object({
    oldPassword: z.string("old Password incorrect"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    retypePassword: z.string().min(8, {
      error: "Password must be at least 8 characters",
    }),
  })
  .refine((data) => data.newPassword === data.retypePassword, {
    error: "Passwords do not match",
    path: ["retypePassword"],
  });
