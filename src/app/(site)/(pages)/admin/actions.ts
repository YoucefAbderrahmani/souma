"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { categoryTable, imageTable, productsTable } from "@/server/db/schema";
import { parseProductContent, serializeProductContent } from "@/lib/product-content";

export type CreateProductState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type UpdateProductState = {
  success?: boolean;
  error?: string;
  message?: string;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Standard list price is 20% above Vitrina when Vitrina mode is on */
const VITRINA_STANDARD_MARKUP = 0.2;

function parseAdminPriceFields(formData: FormData): { price: number; jomlaPrice: number | null } | { error: string } {
  const vitrinaMode = String(formData.get("vitrinaMode") ?? "") === "true";
  const raw = Number(formData.get("price") ?? NaN);
  if (Number.isNaN(raw) || raw < 0) {
    return { error: "Price must be a valid non-negative number." };
  }
  const entered = Math.round(raw);
  if (vitrinaMode) {
    if (entered <= 0) {
      return { error: "Vitrina price must be greater than zero." };
    }
    const standardPrice = Math.round(entered * (1 + VITRINA_STANDARD_MARKUP));
    return { price: standardPrice, jomlaPrice: entered };
  }
  return { price: entered, jomlaPrice: null };
}

export async function createProductAction(
  _prevState: CreateProductState,
  formData: FormData
): Promise<CreateProductState> {
  try {
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const careMaintenance = String(formData.get("careMaintenance") ?? "").trim();
    const manufacturer = String(formData.get("manufacturer") ?? "").trim();
    const categoryName = String(formData.get("categoryName") ?? "").trim();
    const parsedPrice = parseAdminPriceFields(formData);
    if ("error" in parsedPrice) {
      return { error: parsedPrice.error };
    }
    const { price, jomlaPrice } = parsedPrice;
    const instock = Number(formData.get("instock") ?? 0);
    const image = formData.get("image");
    const colors = JSON.parse(String(formData.get("colors") ?? "[]")) as Array<{
      name: string;
      price?: number;
    }>;
    const colorHasPriceOverride = String(formData.get("colorHasPriceOverride") ?? "false") === "true";
    const specifications = JSON.parse(
      String(formData.get("specifications") ?? "[]")
    ) as Array<{
      name: string;
      hasPriceOverride?: boolean;
      options: Array<{ label: string; price?: number }>;
    }>;
    const additionalInfo = JSON.parse(
      String(formData.get("additionalInfo") ?? "[]")
    ) as Array<{ key: string; value: string }>;

    if (!title || !description || !manufacturer || !categoryName) {
      return { error: "Please fill all required fields." };
    }

    if (Number.isNaN(instock) || instock < 0) {
      return { error: "Stock must be a valid positive number." };
    }

    if (!(image instanceof File) || image.size === 0) {
      return { error: "Please upload a product image." };
    }

    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };

    const ext = mimeToExt[image.type];
    if (!ext) {
      return { error: "Unsupported image type. Use jpg, png, webp, or gif." };
    }

    const existingCategory = await db
      .select({ id: categoryTable.id })
      .from(categoryTable)
      .where(sql`lower(${categoryTable.name}) = lower(${categoryName})`)
      .limit(1);

    let categoryId = existingCategory[0]?.id;
    if (!categoryId) {
      const insertedCategory = await db
        .insert(categoryTable)
        .values({ name: categoryName })
        .returning({ id: categoryTable.id });
      categoryId = insertedCategory[0]?.id;
    }

    if (!categoryId) return { error: "Failed to resolve product category." };

    const slugBase = slugify(title) || "product";
    const slug = `${slugBase}-${Date.now()}`;
    const structuredDescription = serializeProductContent({
      description,
      careMaintenance,
      colors: Array.isArray(colors) ? colors : [],
      colorHasPriceOverride,
      specifications: Array.isArray(specifications) ? specifications : [],
      additionalInfo: Array.isArray(additionalInfo) ? additionalInfo : [],
    });

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${slug}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const fileBuffer = Buffer.from(await image.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    const imageUrl = `/uploads/products/${fileName}`;

    const inserted = await db
      .insert(productsTable)
      .values({
        slug,
        title,
        mainimage: imageUrl,
        price,
        jomlaPrice,
        rating: 0,
        description: structuredDescription,
        manufacturer,
        instock,
        categoryId,
      })
      .returning({ id: productsTable.id });

    const productId = inserted[0]?.id;
    if (productId) {
      await db.insert(imageTable).values({
        productId,
        image: imageUrl,
      });
    }

    return {
      success: true,
      message: "Product created successfully.",
    };
  } catch {
    return { error: "Failed to create product. Try again." };
  }
}

export async function updateProductPricingStockAction(
  _prevState: UpdateProductState,
  formData: FormData
): Promise<UpdateProductState> {
  try {
    const productId = String(formData.get("productId") ?? "").trim();
    const price = Number(formData.get("price") ?? 0);
    const instock = Number(formData.get("instock") ?? 0);

    if (!productId) return { error: "Missing product id." };
    if (Number.isNaN(price) || price < 0) return { error: "Invalid price." };
    if (Number.isNaN(instock) || instock < 0) return { error: "Invalid stock quantity." };

    await db
      .update(productsTable)
      .set({ price, instock })
      .where(sql`${productsTable.id} = ${productId}`);

    revalidatePath("/admin");
    revalidatePath("/shop-with-sidebar");
    return { success: true, message: "Price and stock updated." };
  } catch {
    return { error: "Failed to update product price/stock." };
  }
}

export async function updateProductDetailsAction(
  _prevState: UpdateProductState,
  formData: FormData
): Promise<UpdateProductState> {
  try {
    const productId = String(formData.get("productId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const manufacturer = String(formData.get("manufacturer") ?? "").trim();
    const categoryName = String(formData.get("categoryName") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const careMaintenance = String(formData.get("careMaintenance") ?? "").trim();

    if (!productId || !title || !manufacturer || !categoryName || !description) {
      return { error: "Please fill all required fields." };
    }

    const productRow = await db
      .select({ description: productsTable.description })
      .from(productsTable)
      .where(sql`${productsTable.id} = ${productId}`)
      .limit(1);

    if (!productRow[0]) return { error: "Product not found." };

    const existingCategory = await db
      .select({ id: categoryTable.id })
      .from(categoryTable)
      .where(sql`lower(${categoryTable.name}) = lower(${categoryName})`)
      .limit(1);

    let categoryId = existingCategory[0]?.id;
    if (!categoryId) {
      const insertedCategory = await db
        .insert(categoryTable)
        .values({ name: categoryName })
        .returning({ id: categoryTable.id });
      categoryId = insertedCategory[0]?.id;
    }

    if (!categoryId) return { error: "Failed to resolve product category." };

    const parsed = parseProductContent(productRow[0].description);
    const mergedDescription = serializeProductContent({
      ...parsed,
      description,
      careMaintenance,
    });

    await db
      .update(productsTable)
      .set({
        title,
        manufacturer,
        categoryId,
        description: mergedDescription,
      })
      .where(sql`${productsTable.id} = ${productId}`);

    revalidatePath("/admin");
    revalidatePath("/shop-with-sidebar");
    return { success: true, message: "Product details updated." };
  } catch {
    return { error: "Failed to update product details." };
  }
}

export async function updateProductFullAction(
  _prevState: UpdateProductState,
  formData: FormData
): Promise<UpdateProductState> {
  try {
    const productId = String(formData.get("productId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const careMaintenance = String(formData.get("careMaintenance") ?? "").trim();
    const manufacturer = String(formData.get("manufacturer") ?? "").trim();
    const categoryName = String(formData.get("categoryName") ?? "").trim();
    const parsedPrice = parseAdminPriceFields(formData);
    if ("error" in parsedPrice) {
      return { error: parsedPrice.error };
    }
    const { price, jomlaPrice } = parsedPrice;
    const instock = Number(formData.get("instock") ?? 0);
    const rating = Math.round(Number(formData.get("rating") ?? 0));
    const image = formData.get("image");
    const colors = JSON.parse(String(formData.get("colors") ?? "[]")) as Array<{
      name: string;
      price?: number;
    }>;
    const colorHasPriceOverride = String(formData.get("colorHasPriceOverride") ?? "false") === "true";
    const specifications = JSON.parse(
      String(formData.get("specifications") ?? "[]")
    ) as Array<{
      name: string;
      hasPriceOverride?: boolean;
      options: Array<{ label: string; price?: number }>;
    }>;
    const additionalInfo = JSON.parse(
      String(formData.get("additionalInfo") ?? "[]")
    ) as Array<{ key: string; value: string }>;

    if (!productId || !title || !description || !manufacturer || !categoryName) {
      return { error: "Please fill all required fields." };
    }

    if (Number.isNaN(instock) || instock < 0) {
      return { error: "Stock must be a valid positive number." };
    }

    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
      return { error: "Rating must be between 0 and 5." };
    }

    const existingRow = await db
      .select({ slug: productsTable.slug, mainimage: productsTable.mainimage })
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);

    if (!existingRow[0]) {
      return { error: "Product not found." };
    }

    let mainimage = existingRow[0].mainimage;

    if (image instanceof File && image.size > 0) {
      const mimeToExt: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const ext = mimeToExt[image.type];
      if (!ext) {
        return { error: "Unsupported image type. Use jpg, png, webp, or gif." };
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
      await mkdir(uploadDir, { recursive: true });

      const fileName = `${existingRow[0].slug}.${ext}`;
      const filePath = path.join(uploadDir, fileName);
      const fileBuffer = Buffer.from(await image.arrayBuffer());
      await writeFile(filePath, fileBuffer);
      mainimage = `/uploads/products/${fileName}`;
    }

    const existingCategory = await db
      .select({ id: categoryTable.id })
      .from(categoryTable)
      .where(sql`lower(${categoryTable.name}) = lower(${categoryName})`)
      .limit(1);

    let categoryId = existingCategory[0]?.id;
    if (!categoryId) {
      const insertedCategory = await db
        .insert(categoryTable)
        .values({ name: categoryName })
        .returning({ id: categoryTable.id });
      categoryId = insertedCategory[0]?.id;
    }

    if (!categoryId) return { error: "Failed to resolve product category." };

    const structuredDescription = serializeProductContent({
      description,
      careMaintenance,
      colors: Array.isArray(colors) ? colors : [],
      colorHasPriceOverride,
      specifications: Array.isArray(specifications) ? specifications : [],
      additionalInfo: Array.isArray(additionalInfo) ? additionalInfo : [],
    });

    await db
      .update(productsTable)
      .set({
        title,
        mainimage,
        price,
        jomlaPrice,
        rating,
        description: structuredDescription,
        manufacturer,
        instock,
        categoryId,
      })
      .where(eq(productsTable.id, productId));

    if (image instanceof File && image.size > 0) {
      await db.delete(imageTable).where(eq(imageTable.productId, productId));
      await db.insert(imageTable).values({
        productId,
        image: mainimage,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/shop-with-sidebar");
    return { success: true, message: "Product updated successfully." };
  } catch {
    return { error: "Failed to update product. Try again." };
  }
}
