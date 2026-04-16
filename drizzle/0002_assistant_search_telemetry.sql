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
