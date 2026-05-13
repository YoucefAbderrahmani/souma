import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { productReviewTable, siteFeedbackTable, user } from "@/server/db/schema";

let tablesEnsured = false;

export type ProductReviewDTO = {
  id: string;
  productLocalId: number;
  productTitle: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    lastname: string;
    image: string | null;
  };
};

export type SiteFeedbackDTO = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    lastname: string;
    image: string | null;
  };
};

export async function ensureReviewTables() {
  if (tablesEnsured) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS product_review (
      id text PRIMARY KEY,
      product_local_id integer NOT NULL,
      product_title text NOT NULL,
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      rating integer NOT NULL,
      comment text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS product_review_product_local_id_idx
    ON product_review(product_local_id)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS site_feedback (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      rating integer NOT NULL,
      comment text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  tablesEnsured = true;
}

export async function listProductReviews(productLocalId: number): Promise<ProductReviewDTO[]> {
  await ensureReviewTables();

  const rows = await db
    .select({
      id: productReviewTable.id,
      productLocalId: productReviewTable.productLocalId,
      productTitle: productReviewTable.productTitle,
      rating: productReviewTable.rating,
      comment: productReviewTable.comment,
      createdAt: productReviewTable.createdAt,
      userId: user.id,
      userName: user.name,
      userLastname: user.lastname,
      userImage: user.image,
    })
    .from(productReviewTable)
    .innerJoin(user, eq(productReviewTable.userId, user.id))
    .where(eq(productReviewTable.productLocalId, productLocalId))
    .orderBy(desc(productReviewTable.createdAt));

  return rows.map((row) => ({
    id: row.id,
    productLocalId: row.productLocalId,
    productTitle: row.productTitle,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
    user: {
      id: row.userId,
      name: row.userName,
      lastname: row.userLastname,
      image: row.userImage ?? null,
    },
  }));
}

/**
 * Best written review for storefront hero merchandising: highest star rating first,
 * then longer comments, then newest (tie-breakers among top ratings).
 */
export async function getBestProductReviewForMerch(
  productLocalId: number
): Promise<{ rating: number; comment: string } | null> {
  await ensureReviewTables();
  if (!Number.isFinite(productLocalId) || productLocalId <= 0) return null;

  const rows = await db
    .select({
      rating: productReviewTable.rating,
      comment: productReviewTable.comment,
      createdAt: productReviewTable.createdAt,
    })
    .from(productReviewTable)
    .where(eq(productReviewTable.productLocalId, productLocalId))
    .orderBy(desc(productReviewTable.rating), desc(productReviewTable.createdAt))
    .limit(60);

  const withBody = rows
    .map((r) => ({
      rating: r.rating,
      comment: r.comment.trim(),
      createdAt: r.createdAt.getTime(),
    }))
    .filter((r) => r.comment.length > 0);
  if (withBody.length === 0) return null;

  withBody.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.comment.length !== a.comment.length) return b.comment.length - a.comment.length;
    return b.createdAt - a.createdAt;
  });

  const best = withBody[0];
  return { rating: best.rating, comment: best.comment };
}

export async function createProductReview(input: {
  productLocalId: number;
  productTitle: string;
  userId: string;
  rating: number;
  comment: string;
}) {
  await ensureReviewTables();
  await db.insert(productReviewTable).values({
    id: crypto.randomUUID(),
    productLocalId: input.productLocalId,
    productTitle: input.productTitle,
    userId: input.userId,
    rating: input.rating,
    comment: input.comment,
  });
}

export async function listSiteFeedbacks(limit = 20): Promise<SiteFeedbackDTO[]> {
  await ensureReviewTables();

  const rows = await db
    .select({
      id: siteFeedbackTable.id,
      rating: siteFeedbackTable.rating,
      comment: siteFeedbackTable.comment,
      createdAt: siteFeedbackTable.createdAt,
      userId: user.id,
      userName: user.name,
      userLastname: user.lastname,
      userImage: user.image,
    })
    .from(siteFeedbackTable)
    .innerJoin(user, eq(siteFeedbackTable.userId, user.id))
    .orderBy(desc(siteFeedbackTable.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
    user: {
      id: row.userId,
      name: row.userName,
      lastname: row.userLastname,
      image: row.userImage ?? null,
    },
  }));
}

export async function createSiteFeedback(input: {
  userId: string;
  rating: number;
  comment: string;
}) {
  await ensureReviewTables();

  const duplicate = await db
    .select({ id: siteFeedbackTable.id })
    .from(siteFeedbackTable)
    .where(and(eq(siteFeedbackTable.userId, input.userId), eq(siteFeedbackTable.comment, input.comment)))
    .limit(1);

  if (duplicate[0]) {
    return;
  }

  await db.insert(siteFeedbackTable).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    rating: input.rating,
    comment: input.comment,
  });
}
