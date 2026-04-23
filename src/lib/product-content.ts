export type ProductSpec = {
  name: string;
  hasPriceOverride?: boolean;
  options: Array<{
    label: string;
    price?: number;
  }>;
};

export type ProductAdditionalInfo = {
  key: string;
  value: string;
};

export type ProductStructuredContent = {
  description: string;
  careMaintenance?: string;
  colors: Array<{
    name: string;
    price?: number;
    /** When false, selection is blocked and `out_of_stock_click` is tracked. */
    inStock?: boolean;
  }>;
  colorHasPriceOverride?: boolean;
  specifications: ProductSpec[];
  additionalInfo: ProductAdditionalInfo[];
};

const MARKER = "[[PRODUCT_CONTENT_V1]]";

export function serializeProductContent(content: ProductStructuredContent): string {
  return `${MARKER}\n${JSON.stringify(content)}`;
}

export function parseProductContent(raw?: string | null): ProductStructuredContent {
  const safe = String(raw ?? "").trim();

  if (!safe) {
    return {
      description: "",
      careMaintenance: "",
      colors: [
        { name: "red" },
        { name: "blue" },
        { name: "orange" },
        { name: "pink" },
        { name: "purple" },
      ],
      colorHasPriceOverride: false,
      specifications: [],
      additionalInfo: [],
    };
  }

  if (!safe.startsWith(MARKER)) {
    return {
      description: safe,
      careMaintenance: "",
      colors: [
        { name: "red" },
        { name: "blue" },
        { name: "orange" },
        { name: "pink" },
        { name: "purple" },
      ],
      colorHasPriceOverride: false,
      specifications: [],
      additionalInfo: [],
    };
  }

  try {
    const json = safe.slice(MARKER.length).trim();
    const parsed = JSON.parse(json) as Partial<ProductStructuredContent>;
    const parsedColors = Array.isArray(parsed.colors) ? parsed.colors : [];
    const colors =
      parsedColors.length > 0 && typeof parsedColors[0] === "string"
        ? parsedColors.map((name) => ({ name: String(name) }))
        : parsedColors
            .map((item) => {
              const raw = item as { name?: string; price?: unknown; inStock?: unknown };
              let inStock: boolean | undefined;
              if (raw.inStock !== undefined) {
                const v = raw.inStock;
                if (v === false || v === "false" || v === 0) inStock = false;
                else if (v === true || v === "true" || v === 1) inStock = true;
              }
              return {
                name: String(raw?.name ?? "").trim(),
                price: typeof raw.price === "number" ? Number(raw.price) : undefined,
                ...(inStock === undefined ? {} : { inStock }),
              };
            })
            .filter((item) => item.name);

    return {
      description: String(parsed.description ?? ""),
      careMaintenance: String(parsed.careMaintenance ?? ""),
      colors:
        colors.length > 0
          ? colors
          : [
              { name: "red" },
              { name: "blue" },
              { name: "orange" },
              { name: "pink" },
              { name: "purple" },
            ],
      colorHasPriceOverride: Boolean(parsed.colorHasPriceOverride),
      specifications: Array.isArray(parsed.specifications)
        ? parsed.specifications
            .map((item) => ({
              name: String(item?.name ?? "").trim(),
              hasPriceOverride: Boolean(item?.hasPriceOverride),
              options: Array.isArray(item?.options)
                ? item.options
                    .map((option) =>
                      typeof option === "string"
                        ? { label: option, price: undefined }
                        : {
                            label: String(option?.label ?? "").trim(),
                            price:
                              typeof option?.price === "number"
                                ? Number(option.price)
                                : undefined,
                          }
                    )
                    .filter((option) => option.label)
                : [],
            }))
            .filter((item) => item.name && item.options.length > 0)
        : [],
      additionalInfo: Array.isArray(parsed.additionalInfo)
        ? parsed.additionalInfo
            .map((item) => ({
              key: String(item?.key ?? "").trim(),
              value: String(item?.value ?? "").trim(),
            }))
            .filter((item) => item.key && item.value)
        : [],
    };
  } catch {
    return {
      description: safe,
      careMaintenance: "",
      colors: [
        { name: "red" },
        { name: "blue" },
        { name: "orange" },
        { name: "pink" },
        { name: "purple" },
      ],
      colorHasPriceOverride: false,
      specifications: [],
      additionalInfo: [],
    };
  }
}
