import { NextResponse } from "next/server";
import { applyPurchaseInventory } from "@/server/data-access/product-inventory";

export const dynamic = "force-dynamic";

type PurchaseBody = {
  items?: Array<{ id?: unknown; productId?: unknown; quantity?: unknown; title?: unknown }>;
};

export async function POST(req: Request) {
  let body: PurchaseBody;
  try {
    body = (await req.json()) as PurchaseBody;
  } catch {
    return NextResponse.json({ error: "invalid_body", message: "Invalid JSON payload." }, { status: 400 });
  }

  const items = Array.isArray(body.items)
    ? body.items
        .map((item) => ({
          productId: Number(item.productId ?? item.id),
          quantity: Math.max(1, Math.trunc(Number(item.quantity ?? 1))),
          title: typeof item.title === "string" ? item.title : undefined,
        }))
        .filter((item) => Number.isFinite(item.productId) && item.productId > 0)
    : [];

  if (items.length === 0) {
    return NextResponse.json(
      { error: "invalid_body", message: "Expected at least one purchasable item." },
      { status: 400 }
    );
  }

  const result = await applyPurchaseInventory(items);
  if (result.ok === false) {
    return NextResponse.json({ error: "inventory_unavailable", message: result.error }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    inventory: result.inventory,
    committedAt: new Date().toISOString(),
  });
}
