CREATE TABLE IF NOT EXISTS "product_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "content_type" varchar(64) NOT NULL,
  "data_base64" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
