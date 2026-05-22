export type AdminSizeFormRow = {
  id: string;
  label: string;
  price: string;
};

export type ProductSizePayload = {
  label: string;
  price?: number;
  inStock?: boolean;
};

export function newAdminSizeFormRow(): AdminSizeFormRow {
  return { id: crypto.randomUUID(), label: "", price: "" };
}

export function buildSizesPayload(
  rows: Array<{ label: string; price?: number; inStock?: boolean }>
): ProductSizePayload[] {
  return rows
    .map((row) => ({
      label: row.label.trim(),
      ...(typeof row.price === "number" && Number.isFinite(row.price) ? { price: row.price } : {}),
      ...(row.inStock === false ? { inStock: false } : {}),
    }))
    .filter((row) => row.label);
}

export function parseSizesFormJson(raw: string): { rows: AdminSizeFormRow[] } | { error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return { error: "Invalid sizes payload." };
    const rows = parsed
      .map((item) => {
        const row = item as { label?: string; price?: string | number; inStock?: boolean };
        return {
          id: crypto.randomUUID(),
          label: String(row.label ?? "").trim(),
          price:
            row.price != null && row.price !== "" && !Number.isNaN(Number(row.price))
              ? String(row.price)
              : "",
        };
      })
      .filter((row) => row.label || row.price);
    return { rows: rows.length > 0 ? rows : [newAdminSizeFormRow()] };
  } catch {
    return { error: "Invalid sizes payload." };
  }
}
