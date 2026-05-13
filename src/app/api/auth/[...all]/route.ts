import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { isNeonDataTransferQuotaError, noteDatabaseOutage } from "@/server/db-degraded";

const { GET: runAuth } = toNextJsHandler(auth.handler);

function quota503() {
  return NextResponse.json(
    {
      code: "DATABASE_QUOTA_EXCEEDED",
      message:
        "Authentication is temporarily unavailable because the database transfer limit was reached. Please try again later or upgrade your database plan.",
    },
    { status: 503 }
  );
}

/** Handles both thrown errors and 5xx Response bodies from Better Auth / Drizzle. */
function looksLikeNeonQuota(errorOrText: unknown): boolean {
  if (isNeonDataTransferQuotaError(errorOrText)) return true;
  const s = String(errorOrText).toLowerCase();
  return (
    s.includes("your project has exceeded") ||
    s.includes("data transfer quota") ||
    s.includes("exceeded the data transfer quota") ||
    s.includes("upgrade your plan to increase limits")
  );
}

async function handleAuthRequest(req: NextRequest) {
  try {
    const res = await runAuth(req);
    if (res.status >= 500) {
      const raw = await res.text().catch(() => "");
      if (looksLikeNeonQuota(raw)) {
        noteDatabaseOutage();
        return quota503();
      }
      return new NextResponse(raw, { status: res.status, headers: res.headers });
    }
    return res;
  } catch (error) {
    if (looksLikeNeonQuota(error)) {
      noteDatabaseOutage();
      return quota503();
    }
    throw error;
  }
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
