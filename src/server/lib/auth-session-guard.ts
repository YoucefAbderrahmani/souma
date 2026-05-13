import type { NextRequest } from "next/server";
import { getCookieCache, getSessionCookie } from "better-auth/cookies";

/** True when the request carries a Better Auth session token cookie (avoids DB session lookup for guests). */
export function hasBetterAuthSessionCookie(req: NextRequest | Request): boolean {
  return Boolean(getSessionCookie(req));
}

type CookieCacheSession = {
  userId?: string;
  user_id?: string;
  user?: { id?: string };
};

/**
 * Resolves signed-in user id from Better Auth's session cookie cache only (HMAC, no Postgres).
 * Use for low-risk telemetry so Neon quota cannot block on `session` table reads.
 */
export async function tryResolveUserIdFromBetterAuthCookieCache(
  req: NextRequest | Request
): Promise<string | null> {
  try {
    const cached = (await getCookieCache(req, {
      secret: process.env.BETTER_AUTH_SECRET,
    })) as CookieCacheSession | null;
    if (!cached || typeof cached !== "object") return null;
    if (typeof cached.user?.id === "string" && cached.user.id.length > 0) return cached.user.id;
    if (typeof cached.userId === "string" && cached.userId.length > 0) return cached.userId;
    if (typeof cached.user_id === "string" && cached.user_id.length > 0) return cached.user_id;
  } catch {
    return null;
  }
  return null;
}
