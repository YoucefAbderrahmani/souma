import type { ProductStructuredContent } from "@/lib/product-content";

export function resolveProductUnitDetailPrice(params: {
  baseDetailPrice: number;
  parsedContent: ProductStructuredContent;
  activeColor?: string;
  selectedSize?: string;
  selectedSpecs?: Record<string, string>;
}): number {
  const { baseDetailPrice, parsedContent, activeColor, selectedSize, selectedSpecs = {} } = params;
  let selectedPrice = baseDetailPrice;

  const selectedColor = parsedContent.colors.find((color) => color.name === activeColor);
  if (parsedContent.colorHasPriceOverride && typeof selectedColor?.price === "number") {
    selectedPrice = selectedColor.price;
  }

  if (parsedContent.sizesEnabled && parsedContent.sizeHasPriceOverride && selectedSize) {
    const sizeOption = parsedContent.sizes.find((size) => size.label === selectedSize);
    if (typeof sizeOption?.price === "number") {
      selectedPrice = sizeOption.price;
    }
  }

  for (const spec of parsedContent.specifications) {
    if (!spec.hasPriceOverride) continue;
    const selectedLabel = selectedSpecs[spec.name];
    const selectedOption = spec.options.find((option) => option.label === selectedLabel);
    if (typeof selectedOption?.price === "number") {
      selectedPrice = selectedOption.price;
    }
  }

  return selectedPrice;
}

export function formatCartVariantTitle(
  baseTitle: string,
  opts?: { size?: string; color?: string }
): string {
  const parts: string[] = [];
  if (opts?.size?.trim()) parts.push(`Size ${opts.size.trim()}`);
  if (opts?.color?.trim()) parts.push(opts.color.trim());
  if (parts.length === 0) return baseTitle;
  return `${baseTitle} (${parts.join(", ")})`;
}
