import { auth } from "@/server/lib/auth";
import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import { customSessionClient } from "better-auth/client/plugins";

const clientBaseURL =
  (typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL.trim()
    ? process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "")
    : "") ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

export const authClient = createAuthClient({
  baseURL: clientBaseURL,
  plugins: [customSessionClient<typeof auth>()],
});
