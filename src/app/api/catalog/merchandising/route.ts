import { NextResponse } from "next/server";
import { getHeroReviewSnippetsByStorefrontIds } from "@/server/data-access/product-catalog";

export const dynamic = "force-dynamic";

function parseRequestedIds(raw: string | null): number[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Math.trunc(value))
    )
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requestedIds = parseRequestedIds(url.searchParams.get("ids"));
  if (requestedIds.length === 0) {
    return NextResponse.json(
      { error: "invalid_query", message: "Expected ids query parameter." },
      { status: 400 }
    );
  }

  const snippets = await getHeroReviewSnippetsByStorefrontIds(requestedIds);
  return NextResponse.json({
    snippets,
    computedAt: new Date().toISOString(),
  });
}
