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
