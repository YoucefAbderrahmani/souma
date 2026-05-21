ALTER TABLE "conception_recommendation"
  ADD COLUMN IF NOT EXISTS "workflow_status" varchar(20) NOT NULL DEFAULT 'active';

ALTER TABLE "conception_recommendation"
  ADD COLUMN IF NOT EXISTS "inbox_at" timestamp;

ALTER TABLE "conception_recommendation"
  ADD COLUMN IF NOT EXISTS "email_sent_at" timestamp;

ALTER TABLE "conception_recommendation"
  ADD COLUMN IF NOT EXISTS "implemented_at" timestamp;
