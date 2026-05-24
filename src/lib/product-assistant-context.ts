import type { Product } from "@/types/product";
import {
  getDisplaySpecifications,
  getProductSizeOptions,
  parseProductContent,
} from "@/lib/product-content";

export type ProductAssistantContextPayload = {
  productId: string;
  title: string;
  availability: string;
  category: string;
  priceMode: "detail" | "jomla";
  detailPrice: number;
  jomlaPrice: number | null;
  descriptionText: string;
  colors: Array<{ name: string; inStock: boolean }>;
  sizes: Array<{ label: string; inStock: boolean }>;
  specifications: Array<{ name: string; options: string[] }>;
  additionalInfo: Array<{ key: string; value: string }>;
};

export function buildProductAssistantContext(
  product: Product,
  availabilityLabel: string,
  priceMode: "detail" | "jomla"
): ProductAssistantContextPayload {
  const parsed = parseProductContent(product.description);
  const displaySpecs = getDisplaySpecifications(parsed);
  const sizeOptions = getProductSizeOptions(parsed);

  const plainDescription = parsed.description?.trim() || "";
  const care = parsed.careMaintenance?.trim();
  const descriptionText = [plainDescription, care ? `Care: ${care}` : ""].filter(Boolean).join("\n");

  return {
    productId: String(product.id),
    title: product.title,
    availability: availabilityLabel,
    category: typeof product.category === "string" ? product.category : String(product.category ?? ""),
    priceMode,
    detailPrice: product.detailPrice,
    jomlaPrice: product.jomlaPrice ?? null,
    descriptionText: descriptionText.slice(0, 1200),
    colors: parsed.colors.map((c) => ({
      name: c.name,
      inStock: c.inStock !== false,
    })),
    sizes: sizeOptions.map((s) => ({
      label: s.label,
      inStock: s.inStock !== false,
    })),
    specifications: displaySpecs.map((spec) => ({
      name: spec.name,
      options: spec.options.map((o) => o.label),
    })),
    additionalInfo: parsed.additionalInfo.map((row) => ({
      key: row.key,
      value: row.value,
    })),
  };
}

export function isProductDiscoveryQuery(query: string) {
  const q = query.toLowerCase();
  return /\b(similar|alternative|cheaper|less expensive|compare|recommend|suggest|other|another|like this|pareil|moins cher|شبه|مشابه|بديل)\b/i.test(
    q
  );
}
