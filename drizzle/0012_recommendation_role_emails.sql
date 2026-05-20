CREATE TABLE IF NOT EXISTS "recommendation_role_email" (
  "role_key" varchar(64) PRIMARY KEY NOT NULL,
  "display_name" varchar(120) NOT NULL,
  "email" varchar(255) NOT NULL DEFAULT '',
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now()
);

INSERT INTO "recommendation_role_email" ("role_key", "display_name", "email")
VALUES
  ('marketing_agent', 'Marketing agent', ''),
  ('technical_support', 'Technical support', '')
ON CONFLICT ("role_key") DO NOTHING;

ALTER TABLE "conception_recommendation"
  ADD COLUMN IF NOT EXISTS "assigned_role_key" varchar(64);
