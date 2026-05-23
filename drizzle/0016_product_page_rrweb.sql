CREATE TABLE IF NOT EXISTS product_page_rrweb (
  product_local_id integer PRIMARY KEY,
  events jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_page_rrweb_updated_at_idx ON product_page_rrweb (updated_at DESC);
