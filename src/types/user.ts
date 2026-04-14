import { z } from "zod";

export const UserDataChangeSchema = z.object({
  // email: z.email({
  //   error: "Invalid email address",
  // }),
  // password: z.string().min(8, {
  //   error: "Password must be at least 8 characters",
  // }),
  // retypePassword: z.string().min(8, {
  //   error: "Password must be at least 8 characters",
  // }),
  // userId: z.string(),
  name: z.string().min(2, { error: "Name is required" }),
  lastname: z.string().min(2, {
    error: "Lastname is required",
  }),
  phone: z.string().min(10, { error: "Phone is required" }).max(10),
});
//   .refine((data) => data.password === data.retypePassword, {
//     error: "Passwords do not match",
//     path: ["retypePassword"],
//   });
export const UserDataEmailChangeSchema = z.object({
  email: z.email({
    error: "Invalid email address",
  }),
});
//   .refine((data) => data.password === data.retypePassword, {
//     error: "Passwords do not match",
//     path: ["retypePassword"],
//   });
