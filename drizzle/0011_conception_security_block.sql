CREATE TABLE IF NOT EXISTS "conception_security_block" (
  "session_key" varchar(64) PRIMARY KEY,
  "reason" text NOT NULL,
  "blocked_at" timestamp NOT NULL DEFAULT now(),
  "lifted_at" timestamp,
  "source" varchar(32) NOT NULL DEFAULT 'manual'
);
