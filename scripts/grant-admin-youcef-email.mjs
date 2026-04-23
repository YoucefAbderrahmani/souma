/**
 * One-off / ops: set admin role in Postgres (e.g. Neon) for the operator Gmail.
 * Usage: node scripts/grant-admin-youcef-email.mjs
 * Loads DATABASE_URL from .env.local (see drizzle.config.ts).
 */
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const email = "youcefyouyou201588@gmail.com";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  const res = await client.query(
    `UPDATE "user" SET role = $1 WHERE lower(email) = lower($2) RETURNING id, email, role`,
    ["admin", email]
  );
  if (res.rowCount === 0) {
    console.error(`No user row found for email: ${email}`);
    process.exit(2);
  }
  console.log("OK: admin granted for", res.rows.map((r) => r.email).join(", "));
} catch (e) {
  console.error(e?.message || e);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
