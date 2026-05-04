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
