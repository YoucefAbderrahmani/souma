import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const SEQUENCE_SESSION_COOKIE = "sq_session";

export function ensureSequenceSessionCookie(req: NextRequest, res: NextResponse): string {
  let key = req.cookies.get(SEQUENCE_SESSION_COOKIE)?.value?.trim();
  if (!key || key.length < 8) {
    key = randomUUID();
    res.cookies.set(SEQUENCE_SESSION_COOKIE, key, {
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
      sameSite: "lax",
      httpOnly: true,
    });
  }
  return key;
}

export function getSequenceSessionKey(req: NextRequest): string | null {
  const key = req.cookies.get(SEQUENCE_SESSION_COOKIE)?.value?.trim();
  return key && key.length >= 8 ? key : null;
}

/** Prefer X-Sequence-Session (client localStorage) so tracking works across immediate navigations. */
export function resolveSequenceKey(req: NextRequest, res: NextResponse): string {
  const header = req.headers.get("x-sequence-session")?.trim();
  if (header && header.length >= 8) {
    const cookie = req.cookies.get(SEQUENCE_SESSION_COOKIE)?.value?.trim();
    if (cookie !== header) {
      // Keep cookie aligned so unload/beacon calls (no custom headers) still resolve this session.
      res.cookies.set(SEQUENCE_SESSION_COOKIE, header, {
        path: "/",
        maxAge: 60 * 60 * 24 * 400,
        sameSite: "lax",
        httpOnly: true,
      });
    }
    return header;
  }
  return ensureSequenceSessionCookie(req, res);
}

export function resolveSequenceKeyMaybe(req: NextRequest): string | null {
  const header = req.headers.get("x-sequence-session")?.trim();
  if (header && header.length >= 8) return header;
  return getSequenceSessionKey(req);
}
