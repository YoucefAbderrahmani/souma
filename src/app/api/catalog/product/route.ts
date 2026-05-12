import { NextResponse } from "next/server";
import { getCatalogProductByRequestedId } from "@/server/data-access/product-catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") ?? NaN);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_query", message: "Expected id query parameter." }, { status: 400 });
  }

  const product = await getCatalogProductByRequestedId(id);
  if (!product) {
    return NextResponse.json({ error: "not_found", message: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ product });
}
