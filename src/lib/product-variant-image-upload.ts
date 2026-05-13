import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const mimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Persist a variant image next to main product uploads. Returns public path `/uploads/products/...`.
 */
export async function saveProductVariantImageFile(params: {
  slug: string;
  /** Unique fragment for the filename (e.g. row index + timestamp). */
  uniqueKey: string;
  file: File;
}): Promise<{ url: string } | { error: string }> {
  const { slug, uniqueKey, file } = params;
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Missing image file." };
  }
  const ext = mimeToExt[file.type];
  if (!ext) {
    return { error: "Unsupported image type. Use jpg, png, webp, or gif." };
  }

  const safeKey = uniqueKey.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${slug}-color-${safeKey}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, fileBuffer);

  return { url: `/uploads/products/${fileName}` };
}
