/**
 * Must be imported first from any `tsx scripts/*.ts` file so `.env.local`
 * is loaded before `@/server/db` (or other modules) read `DATABASE_URL`.
 * ES modules hoist static `import`s, so `dotenv.config()` in a script body
 * runs too late for a top-level `import { db } from "@/server/db"`.
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();
