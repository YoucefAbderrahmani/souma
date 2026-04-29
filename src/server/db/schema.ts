import {
  pgTable,
  text,
  timestamp,
  boolean,
  varchar,
  integer,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  lastname: text("last_name").notNull(),
  phone: varchar("phone", { length: 10 }).notNull().unique(),
  role: text("role").notNull().default("user"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

export const wishlistTable = pgTable("wishlist", {
  id: uuid().primaryKey().defaultRandom(),
  // one wishlist has one user
  userId: text()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
});

export const productsTable = pgTable("products", {
  id: uuid().primaryKey().defaultRandom(),
  slug: varchar({ length: 255 }).notNull().unique(),
  title: varchar({ length: 255 }).notNull(),
  mainimage: varchar({ length: 255 }).notNull(),
  /** Shown as strikethrough “standard” when jomlaPrice is set; otherwise the sole list price */
  price: integer().notNull().default(0),
  /** Vitrina (promo) price — when set, customer pays this and price is +20% reference */
  jomlaPrice: integer("jomla_price"),
  rating: integer().notNull().default(0),
  description: varchar({ length: 255 }).notNull(),
  manufacturer: varchar({ length: 255 }).notNull(),
  // in stock attribute for normal ecommerce but for the project with w4t3r
  // replace it with quantity till the product is ordered from the store
  instock: integer().notNull().default(1),
  categoryId: uuid()
    .references(() => categoryTable.id, { onDelete: "cascade" })
    .notNull(),
});

// table to know every product that are in a wishlist, and what every wishlist has in it , and every wishlist belongs to one user
// table can also be called wishlist_items
export const wishlist_to_productTable = pgTable(
  "wishlist_to_product",
  {
    wishlistId: uuid()
      .references(() => wishlistTable.id)
      .notNull(),
    productId: uuid()
      .references(() => productsTable.id)
      .notNull(),
    addedAt: timestamp({ mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.wishlistId, t.productId] }), // Composite PK
  ]
);

export const imageTable = pgTable("image", {
  id: uuid().primaryKey().defaultRandom(),
  productId: uuid()
    .references(() => productsTable.id)
    .notNull(),
  image: varchar({ length: 255 }).notNull(),
});

export const categoryTable = pgTable("category", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
});

/** Browsing funnel: starts on search / category / product click; ends after product page + purchase or leaving product page */
export const shoppingSequenceTable = pgTable("shopping_sequence", {
  id: uuid().primaryKey().defaultRandom(),
  sessionKey: varchar("session_key", { length: 64 }).notNull(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  triggerType: varchar("trigger_type", { length: 32 }).notNull(),
  triggerLabel: text("trigger_label").notNull(),
  /** active | superseded | ended_left | ended_purchase */
  status: varchar("status", { length: 32 }).notNull().default("active"),
  productVisitedAt: timestamp("product_visited_at", { mode: "date" }),
  startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { mode: "date" }),
});

export const costumer_orderTable = pgTable("costumer_order", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .references(() => user.id)
    .notNull(),
  wilaya: varchar({ length: 255 }).notNull(),
  commune: varchar({ length: 255 }).notNull(),
  note: varchar({ length: 255 }),
  datetime: timestamp({ mode: "date" }).notNull().defaultNow(),
  total: integer().notNull().default(0),
});

export const costumer_order_to_productTable = pgTable(
  "costumer_order_to_product",
  {
    orderId: uuid()
      .references(() => costumer_orderTable.id)
      .notNull(),
    productId: uuid()
      .references(() => productsTable.id)
      .notNull(),
    quantity: integer().notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.orderId, t.productId] }), // Composite PK
  ]
);

export const productReviewTable = pgTable("product_review", {
  id: text("id").primaryKey(),
  productLocalId: integer("product_local_id").notNull(),
  productTitle: text("product_title").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const siteFeedbackTable = pgTable("site_feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Assistant search telemetry for relevance tuning:
 * - search_query: one row per assistant request/response.
 * - result_click: one row when user clicks a recommended item.
 */
export const assistantSearchTelemetryTable = pgTable("assistant_search_telemetry", {
  id: uuid().primaryKey().defaultRandom(),
  eventType: varchar("event_type", { length: 32 }).notNull(),
  requestId: varchar("request_id", { length: 64 }).notNull(),
  sessionKey: varchar("session_key", { length: 64 }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  mode: varchar("mode", { length: 16 }).notNull().default("detail"),
  rawQuery: text("raw_query"),
  normalizedQuery: text("normalized_query"),
  detectedLanguage: varchar("detected_language", { length: 64 }),
  provider: varchar("provider", { length: 64 }),
  model: varchar("model", { length: 128 }),
  error: text("error"),
  cacheStatus: varchar("cache_status", { length: 16 }),
  resultCount: integer("result_count").notNull().default(0),
  matchedIdsJson: text("matched_ids_json"),
  clickedProductId: integer("clicked_product_id"),
  clickedPosition: integer("clicked_position"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Micro-interaction events for AI sales / funnel analysis (product page, checkout context).
 * Payload is JSON; event names are lowercase snake_case (e.g. image_index_viewed, price_hover).
 */
export const salesMicroEventTable = pgTable("sales_micro_event", {
  id: uuid().primaryKey().defaultRandom(),
  sessionKey: varchar("session_key", { length: 64 }).notNull(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  productLocalId: integer("product_local_id"),
  productTitle: text("product_title"),
  pagePath: varchar("page_path", { length: 512 }).notNull(),
  referrer: text("referrer"),
  eventName: varchar("event_name", { length: 80 }).notNull(),
  payloadJson: text("payload_json"),
  clientEventAt: timestamp("client_event_at", { mode: "date" }),
  sequenceIndex: integer("sequence_index").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

//Relations
export const userRelations = relations(user, ({ many }) => ({
  wishlists: many(wishlistTable), // One user has many wishlists
}));

export const wishlistRelations = relations(wishlistTable, ({ many, one }) => ({
  // One wishlist has many products
  // Many-to-many via wishlist_to_productTable
  products: many(wishlist_to_productTable),

  // One wishlist has one user
  user: one(user, {
    fields: [wishlistTable.userId], //FK in wishlist table
    references: [user.id], //PK in user table
  }),
}));

export const productRelations = relations(productsTable, ({ many, one }) => ({
  // One product has many images
  images: many(imageTable),
  // One product has one category
  category: one(categoryTable, {
    fields: [productsTable.categoryId],
    references: [categoryTable.id],
  }),
  // One product has many orders
  // Many-to-many via costumer_order_to_productTable
  orders: many(costumer_order_to_productTable),
  wishlists: many(wishlist_to_productTable),
}));

export const wishlist_to_productRelations = relations(
  wishlist_to_productTable,
  ({ one }) => ({
    product: one(productsTable, {
      fields: [wishlist_to_productTable.productId],
      references: [productsTable.id],
    }),
    wishlist: one(wishlistTable, {
      fields: [wishlist_to_productTable.wishlistId],
      references: [wishlistTable.id],
    }),
  })
);
export const imageRelations = relations(imageTable, ({ one }) => ({
  // One image has one product
  product: one(productsTable, {
    fields: [imageTable.productId],
    references: [productsTable.id],
  }),
}));

export const categoryRelations = relations(categoryTable, ({ many }) => ({
  // One category has many products
  products: many(productsTable),
}));

export const costumer_orderRelations = relations(
  costumer_orderTable,
  ({ many, one }) => ({
    // One costumer_order has many products
    // products: many(productsTable),
    // One costumer_order has one user
    user: one(user, {
      fields: [costumer_orderTable.userId],
      references: [user.id],
    }),
  })
);

export const costumer_order_to_productRelations = relations(
  costumer_order_to_productTable,
  ({ one }) => ({
    // One costumer_order_to_product has one costumer_order
    costumer_order: one(costumer_orderTable, {
      fields: [costumer_order_to_productTable.orderId],
      references: [costumer_orderTable.id],
    }),
    // One costumer_order_to_product has one product
    product: one(productsTable, {
      fields: [costumer_order_to_productTable.productId],
      references: [productsTable.id],
    }),
  })
);
