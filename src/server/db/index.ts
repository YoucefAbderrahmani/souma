import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { resolveDatabaseConnectionString } from "@/lib/database-url";

const connectionString = resolveDatabaseConnectionString() ?? "";

export const db = drizzle(connectionString);
