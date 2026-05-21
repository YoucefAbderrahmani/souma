CREATE TABLE IF NOT EXISTS "conception_alert_settings" (
  "id" varchar(16) PRIMARY KEY DEFAULT 'default',
  "settings_json" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "conception_alert_settings" ("id", "settings_json")
VALUES ('default', '{}')
ON CONFLICT ("id") DO NOTHING;
