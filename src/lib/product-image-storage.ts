import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/server/db";
import { productMediaTable } from "@/server/db/schema";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Server Actions + Vercel: keep product photos under this size. */
export const MAX_PRODUCT_IMAGE_BYTES = 4 * 1024 * 1024;

function safeSlugFragment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80);
}

function buildFileName(slug: string, suffix: string | undefined, ext: string): string {
  const base = safeSlugFragment(slug) || "product";
  if (suffix?.trim()) {
    return `${base}-${safeSlugFragment(suffix)}.${ext}`;
  }
  return `${base}.${ext}`;
}

async function saveToPublicDisk(buffer: Buffer, fileName: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);
  return `/uploads/products/${fileName}`;
}

async function saveToVercelBlob(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string | null> {
  try {
    const { put } = await import("@vercel/blob");
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    const blob = await put(`products/${fileName}`, buffer, {
      access: "public",
      contentType: contentType || "application/octet-stream",
      ...(token ? { token } : {}),
    });
    return blob.url;
  } catch (error) {
    console.error("[product-image-storage] Vercel Blob upload failed:", error);
    return null;
  }
}

async function saveToDatabase(buffer: Buffer, contentType: string): Promise<string | null> {
  try {
    const [row] = await db
      .insert(productMediaTable)
      .values({
        contentType: contentType.slice(0, 64) || "application/octet-stream",
        dataBase64: buffer.toString("base64"),
      })
      .returning({ id: productMediaTable.id });

    const id = row?.id;
    return id ? `/api/media/${id}` : null;
  } catch (error) {
    console.error("[product-image-storage] database media save failed:", error);
    return null;
  }
}

/**
 * Persist a product or variant image.
 * Order: local disk (dev) → Vercel Blob (if configured) → Postgres `product_media` (works on Vercel without Blob).
 */
export async function saveProductImageFile(params: {
  slug: string;
  file: File;
  /** e.g. `color-{rowId}-{timestamp}` for variant images */
  fileSuffix?: string;
}): Promise<{ url: string } | { error: string }> {
  const { slug, file, fileSuffix } = params;
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Missing image file." };
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return {
      error: `Image is too large (${Math.round(file.size / 1024)} KB). Maximum is ${Math.round(MAX_PRODUCT_IMAGE_BYTES / 1024)} KB.`,
    };
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return { error: "Unsupported image type. Use jpg, png, webp, or gif." };
  }

  const fileName = buildFileName(slug, fileSuffix, ext);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (!process.env.VERCEL) {
    try {
      const localUrl = await saveToPublicDisk(buffer, fileName);
      return { url: localUrl };
    } catch (localError) {
      console.warn("[product-image-storage] Local disk write failed:", localError);
    }
  }

  const blobUrl = await saveToVercelBlob(buffer, fileName, file.type);
  if (blobUrl) {
    return { url: blobUrl };
  }

  const dbUrl = await saveToDatabase(buffer, file.type);
  if (dbUrl) {
    return { url: dbUrl };
  }

  return {
    error:
      "Could not save the image. Check DATABASE_URL on Vercel, or paste an image URL instead of uploading a file.",
  };
}

export function normalizeProductImageUrl(raw: string): { url: string } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Image URL is empty." };
  if (trimmed.startsWith("/")) return { url: trimmed };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return { url: trimmed };
    }
  } catch {
    /* invalid */
  }
  return { error: "Image URL must be a full https:// link or a path starting with /." };
}
