import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/lib/auth";
import { createProductReview, listProductReviews } from "@/server/reviews/reviews-db";

export async function GET(req: NextRequest) {
  const productId = Number(req.nextUrl.searchParams.get("productId") ?? NaN);
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  try {
    const reviews = await listProductReviews(productId);
    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ error: "Failed to load reviews." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to post a review." }, { status: 401 });
    }

    const body = (await req.json()) as {
      productId?: number;
      productTitle?: string;
      rating?: number;
      comment?: string;
    };

    const productLocalId = Number(body.productId ?? NaN);
    const productTitle = String(body.productTitle ?? "").trim();
    const rating = Number(body.rating ?? 0);
    const comment = String(body.comment ?? "").trim();

    if (!Number.isFinite(productLocalId) || !productTitle) {
      return NextResponse.json({ error: "Invalid product payload." }, { status: 400 });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    if (comment.length < 6 || comment.length > 500) {
      return NextResponse.json(
        { error: "Review comment must be between 6 and 500 characters." },
        { status: 400 }
      );
    }

    await createProductReview({
      productLocalId,
      productTitle,
      userId: session.user.id,
      rating,
      comment,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to post review." }, { status: 500 });
  }
}
