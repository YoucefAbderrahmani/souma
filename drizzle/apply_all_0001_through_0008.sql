-- =============================================================================
-- Combined migrations 0000 → 0008 (Neon / psql: paste once or: psql $URL -f this)
-- =============================================================================
-- BEFORE YOU RUN:
--   • Do NOT prefix with DROP SCHEMA public CASCADE (that wipes the database).
--   • 0000 creates "user", "session", "account", "verification" if missing (fixes Google / auth 500s).
--   • For a FULL empty database, also run: npx drizzle-kit push (syncs all tables from schema.ts).
--   • Safe to re-run: IF NOT EXISTS, DO $$ duplicate_object, ON CONFLICT DO NOTHING.
-- =============================================================================

-- ----- 0000_user_session_account_verification.sql -----
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "last_name" text NOT NULL,
  "phone" varchar(10) NOT NULL UNIQUE,
  "role" text DEFAULT 'user' NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp,
  "updated_at" timestamp
);

-- ----- 0001_shopping_sequence.sql -----
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

-- ----- 0002_assistant_search_telemetry.sql -----
CREATE TABLE IF NOT EXISTS "assistant_search_telemetry" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_type" varchar(32) NOT NULL,
  "request_id" varchar(64) NOT NULL,
  "session_key" varchar(64),
  "user_id" text,
  "mode" varchar(16) DEFAULT 'detail' NOT NULL,
  "raw_query" text,
  "normalized_query" text,
  "detected_language" varchar(64),
  "provider" varchar(64),
  "model" varchar(128),
  "error" text,
  "cache_status" varchar(16),
  "result_count" integer DEFAULT 0 NOT NULL,
  "matched_ids_json" text,
  "clicked_product_id" integer,
  "clicked_position" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "assistant_search_telemetry"
 ADD CONSTRAINT "assistant_search_telemetry_user_id_user_id_fk"
 FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- ----- 0003_sales_micro_event.sql -----
CREATE TABLE IF NOT EXISTS "sales_micro_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_key" varchar(64) NOT NULL,
  "user_id" text,
  "product_local_id" integer,
  "product_title" text,
  "page_path" varchar(512) NOT NULL,
  "referrer" text,
  "event_name" varchar(80) NOT NULL,
  "payload_json" text,
  "client_event_at" timestamp,
  "sequence_index" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "sales_micro_event"
 ADD CONSTRAINT "sales_micro_event_user_id_user_id_fk"
 FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "sales_micro_event_session_key_idx" ON "sales_micro_event" ("session_key");
CREATE INDEX IF NOT EXISTS "sales_micro_event_created_at_idx" ON "sales_micro_event" ("created_at");
CREATE INDEX IF NOT EXISTS "sales_micro_event_event_name_idx" ON "sales_micro_event" ("event_name");

-- ----- 0004_grant_admin_youcef.sql -----
-- Grant admin role to the specified account (no-op if email does not exist).
UPDATE "user"
SET role = 'admin'
WHERE lower(email) = lower('youcefyouyou201588@gmail.com');

-- ----- 0005_grant_admin_both_youcef_accounts.sql -----
-- Grant admin to both Youcef accounts: first name "Youcef" (case-insensitive) on the `user` table,
-- plus the legacy Gmail from 0004 if that row ever used a different `name`.
-- Idempotent. If one account uses another first name, add OR lower(email) = lower('...') and re-run.
UPDATE "user"
SET role = 'admin'
WHERE lower(trim(name)) = 'youcef'
   OR lower(email) = lower('youcefyouyou201588@gmail.com');

-- ----- 0006_grant_admin_youcefyouyou201588.sql -----
-- Idempotent: ensure youcefyouyou201588@gmail.com has admin (see also 0004, 0005).
UPDATE "user"
SET role = 'admin'
WHERE lower(email) = lower('youcefyouyou201588@gmail.com');

-- ----- 0007_conception_intel.sql -----
CREATE TABLE IF NOT EXISTS "conception_alert" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "alert_type" varchar(48) NOT NULL,
  "severity" varchar(16) NOT NULL,
  "title" varchar(200) NOT NULL,
  "description" text NOT NULL,
  "detail" text,
  "affected_sessions_estimate" integer,
  "metadata_json" text,
  "fingerprint" varchar(160) NOT NULL,
  "dismissed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "conception_alert_fingerprint_uidx"
  ON "conception_alert" ("fingerprint");

CREATE INDEX IF NOT EXISTS "conception_alert_created_at_idx" ON "conception_alert" ("created_at");
CREATE INDEX IF NOT EXISTS "conception_alert_dismissed_at_idx" ON "conception_alert" ("dismissed_at");

CREATE TABLE IF NOT EXISTS "conception_recommendation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "priority" varchar(16) NOT NULL,
  "impact_label" varchar(80),
  "title" varchar(200) NOT NULL,
  "analysis" text NOT NULL,
  "recommendation" text NOT NULL,
  "confidence" integer DEFAULT 70 NOT NULL,
  "revenue_hint" varchar(64),
  "implementation_hint" varchar(64),
  "roi_hint" varchar(32),
  "evidence_json" text,
  "fingerprint" varchar(160) NOT NULL,
  "dismissed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "conception_recommendation_fingerprint_uidx"
  ON "conception_recommendation" ("fingerprint");

CREATE INDEX IF NOT EXISTS "conception_recommendation_created_at_idx" ON "conception_recommendation" ("created_at");
CREATE INDEX IF NOT EXISTS "conception_recommendation_dismissed_at_idx" ON "conception_recommendation" ("dismissed_at");

-- ----- 0008_product_analytics_tracking_config.sql -----
CREATE TABLE IF NOT EXISTS product_analytics_tracking_config (
  id varchar(32) PRIMARY KEY DEFAULT 'default',
  disabled_events_json text NOT NULL DEFAULT '[]',
  updated_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO product_analytics_tracking_config (id, disabled_events_json)
VALUES ('default', '[]')
ON CONFLICT (id) DO NOTHING;
