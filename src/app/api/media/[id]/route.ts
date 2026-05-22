import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { productMediaTable } from "@/server/db/schema";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const mediaId = typeof id === "string" ? id.trim() : "";
  if (!mediaId || mediaId.length > 64) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const [row] = await db
      .select({
        contentType: productMediaTable.contentType,
        dataBase64: productMediaTable.dataBase64,
      })
      .from(productMediaTable)
      .where(eq(productMediaTable.id, mediaId))
      .limit(1);

    if (!row?.dataBase64) {
      return new NextResponse("Not found", { status: 404 });
    }

    const bytes = Buffer.from(row.dataBase64, "base64");
    if (!bytes.length) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": row.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[api/media]", error);
    return new NextResponse("Error", { status: 500 });
  }
}
