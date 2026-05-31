import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/lib/auth";
import { getUserCartItems, saveUserCartItems } from "@/server/data-access/user-cart";
import type { CartItem } from "@/redux/features/cart-slice";

const cartItemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(500),
  price: z.number().finite(),
  discountedPrice: z.number().finite(),
  quantity: z.number().int().min(1).max(999),
  selectedColor: z.string().max(120).optional(),
  selectedSize: z.string().max(120).optional(),
  imgs: z
    .object({
      thumbnails: z.array(z.string()),
      previews: z.array(z.string()),
    })
    .optional(),
});

const putBodySchema = z.object({
  items: z.array(cartItemSchema).max(200),
});

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await getUserCartItems(session.user.id);
  return NextResponse.json({ items });
}

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart payload" }, { status: 400 });
  }
  await saveUserCartItems(session.user.id, parsed.data.items as CartItem[]);
  return NextResponse.json({ ok: true });
}
