import { auth } from "@/server/lib/auth";
import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import { customSessionClient } from "better-auth/client/plugins";

/**
 * Cookies + OAuth must target the origin the user actually loads. Prefer the live browser
 * origin over NEXT_PUBLIC_APP_URL when they differ (www vs apex, preview URL, stale build env).
 * Set NEXT_PUBLIC_BETTER_AUTH_URL only if /api/auth is on another origin.
 */
function resolveAuthClientBaseURL(): string {
  const explicit =
    (typeof process.env.NEXT_PUBLIC_BETTER_AUTH_URL === "string" &&
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL.trim().replace(/\/$/, "")) ||
    "";

  if (explicit) return explicit;

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  const appUrl =
    (typeof process.env.NEXT_PUBLIC_APP_URL === "string" &&
      process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "")) ||
    "";

  return appUrl || "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: resolveAuthClientBaseURL(),
  plugins: [customSessionClient<typeof auth>()],
});
