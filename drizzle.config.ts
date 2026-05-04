import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolveDatabaseConnectionString } from "./src/lib/database-url";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const url = resolveDatabaseConnectionString();

export default defineConfig({
  out: "./drizzle",
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: url ?? "",
  },
});
