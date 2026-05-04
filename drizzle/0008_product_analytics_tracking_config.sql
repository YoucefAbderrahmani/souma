CREATE TABLE IF NOT EXISTS product_analytics_tracking_config (
  id varchar(32) PRIMARY KEY DEFAULT 'default',
  disabled_events_json text NOT NULL DEFAULT '[]',
  updated_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO product_analytics_tracking_config (id, disabled_events_json)
VALUES ('default', '[]')
ON CONFLICT (id) DO NOTHING;
