ALTER TABLE "products"
ALTER COLUMN "description" TYPE text
USING "description"::text;
