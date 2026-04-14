-- Run against your Postgres database if the table is missing (e.g. psql or Drizzle push).
CREATE TABLE IF NOT EXISTS "shopping_sequence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_key" varchar(64) NOT NULL,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "trigger_type" varchar(32) NOT NULL,
  "trigger_label" text NOT NULL,
  "status" varchar(32) DEFAULT 'active' NOT NULL,
  "product_visited_at" timestamp,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "ended_at" timestamp
);
