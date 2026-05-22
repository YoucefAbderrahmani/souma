import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;
  try {
    const { put } = await import("@vercel/blob");
    const blob = await put(`products/${fileName}`, buffer, {
      access: "public",
      token,
      contentType: contentType || "application/octet-stream",
    });
    return blob.url;
  } catch (error) {
    console.error("[product-image-storage] Vercel Blob upload failed:", error);
    return null;
  }
}

/**
 * Persist a product or variant image. Local `public/uploads` in dev; Vercel Blob in production.
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

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return { error: "Unsupported image type. Use jpg, png, webp, or gif." };
  }

  const fileName = buildFileName(slug, fileSuffix, ext);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const localUrl = await saveToPublicDisk(buffer, fileName);
    return { url: localUrl };
  } catch (localError) {
    console.warn("[product-image-storage] Local disk write failed:", localError);
  }

  const blobUrl = await saveToVercelBlob(buffer, fileName, file.type);
  if (blobUrl) {
    return { url: blobUrl };
  }

  if (process.env.VERCEL) {
    return {
      error:
        "Image upload on Vercel needs a Blob store. In the Vercel project → Storage → create Blob, then redeploy (BLOB_READ_WRITE_TOKEN). Or paste an image URL instead of uploading a file.",
    };
  }

  return {
    error: "Could not save the image. Check that public/uploads/products is writable on the server.",
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
