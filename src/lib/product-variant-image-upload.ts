import { saveProductImageFile } from "@/lib/product-image-storage";

/**
 * Persist a variant image. Returns public URL (local `/uploads/...` or Vercel Blob https URL).
 */
export async function saveProductVariantImageFile(params: {
  slug: string;
  uniqueKey: string;
  file: File;
}): Promise<{ url: string } | { error: string }> {
  return saveProductImageFile({
    slug: params.slug,
    file: params.file,
    fileSuffix: `color-${params.uniqueKey}`,
  });
}
