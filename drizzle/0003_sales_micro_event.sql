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
