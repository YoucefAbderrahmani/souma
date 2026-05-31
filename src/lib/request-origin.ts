import type { NextRequest } from "next/server";

/**
 * Origin for redirects (e.g. Chargily return URLs).
 * Prefer the live request host so payment returns land on the same origin as checkout
 * (sessionStorage for pending purchase is per-origin).
 */
export function resolveRequestOrigin(
  req: Pick<NextRequest, "headers">,
  clientOrigin?: string | null
): string {
  const fromClient = normalizeOrigin(clientOrigin);
  const fromRequest = detectOriginFromRequestHeaders(req.headers);

  if (fromClient && fromRequest) {
    try {
      if (new URL(fromClient).host === new URL(fromRequest).host) {
        return fromClient;
      }
    } catch {
      /* fall through */
    }
  }

  if (fromRequest) return fromRequest;

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  return fromClient ?? "http://localhost:3000";
}

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function detectOriginFromRequestHeaders(headers: Headers): string | null {
  const originHeader = headers.get("origin")?.trim();
  if (originHeader) {
    const normalized = normalizeOrigin(originHeader);
    if (normalized) return normalized;
  }

  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return null;
  const protocol = headers.get("x-forwarded-proto")?.trim() || "https";
  const hostOnly = host.split(",")[0]?.trim();
  if (!hostOnly) return null;
  return `${protocol}://${hostOnly}`.replace(/\/+$/, "");
}
