CREATE TABLE IF NOT EXISTS "storefront_hidden_product" (
  "normalized_title" varchar(512) PRIMARY KEY NOT NULL,
  "title" varchar(255) NOT NULL,
  "hidden_at" timestamp DEFAULT now() NOT NULL
);
