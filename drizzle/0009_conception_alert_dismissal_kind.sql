ALTER TABLE "conception_alert"
  ADD COLUMN IF NOT EXISTS "dismissal_kind" varchar(16);
