import { NextResponse } from "next/server";
import { appendFile } from "fs/promises";
import path from "path";

/**
 * Debug-only cart persistence telemetry. Safe JSON body; no secrets.
 * Vercel: lines appear in Function logs with prefix [cart-debug].
 * Local dev: also appends NDJSON to debug-ee41ca.log when NODE_ENV=development.
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const line = JSON.stringify(payload);
    console.log("[cart-debug]", line);
    if (process.env.NODE_ENV === "development") {
      await appendFile(path.join(process.cwd(), "debug-ee41ca.log"), `${line}\n`).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
