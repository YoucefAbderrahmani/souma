import { NextResponse } from "next/server";
import { getLiveInventoryByStorefrontIds } from "@/server/data-access/product-inventory";

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

function shouldForceInventoryZeroInDev(url: URL): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.FORCE_CATALOG_INVENTORY_ZERO === "1") return true;
  return url.searchParams.get("forceInventoryZero") === "1";
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

  if (shouldForceInventoryZeroInDev(url)) {
    const inventory = Object.fromEntries(requestedIds.map((id) => [String(id), 0]));
    return NextResponse.json({
      inventory,
      computedAt: new Date().toISOString(),
      _debug: { forceInventoryZero: true },
    });
  }

  const inventory = await getLiveInventoryByStorefrontIds(requestedIds);
  return NextResponse.json({
    inventory,
    computedAt: new Date().toISOString(),
  });
}
