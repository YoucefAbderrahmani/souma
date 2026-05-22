export type AdminColorFormRowPayload = {
  rowKey?: string;
  rowIndex?: number;
  name: string;
  price?: number;
  imageUrl?: string;
};

export function reorderColorsWithDefault<T extends { name: string }>(
  colors: T[],
  defaultColorName: string
): T[] {
  if (colors.length === 0) return colors;
  const resolvedDefault = defaultColorName.trim() || colors[0]!.name;
  const defaultIndex = colors.findIndex(
    (c) => c.name.trim().toLowerCase() === resolvedDefault.toLowerCase()
  );
  if (defaultIndex <= 0) return colors;
  const copy = [...colors];
  const [defaultColor] = copy.splice(defaultIndex, 1);
  return [defaultColor!, ...copy];
}

export function buildColorsPayload(
  rows: AdminColorFormRowPayload[],
  defaultColorName: string
): AdminColorFormRowPayload[] {
  const enriched = rows
    .map((row) => ({
      rowKey: row.rowKey,
      rowIndex: row.rowIndex,
      name: row.name.trim(),
      ...(typeof row.price === "number" && !Number.isNaN(row.price) ? { price: row.price } : {}),
      ...(row.imageUrl?.trim() ? { imageUrl: row.imageUrl.trim() } : {}),
    }))
    .filter((row) => row.name);

  return reorderColorsWithDefault(enriched, defaultColorName);
}

export function mainImageFromColors(
  colors: Array<{ imageUrl?: string }>,
  fallbackUrl?: string | null
): { url: string } | { error: string } {
  const fromColors = colors.map((c) => c.imageUrl?.trim()).find(Boolean);
  if (fromColors) return { url: fromColors };
  const fallback = fallbackUrl?.trim();
  if (fallback) return { url: fallback };
  return {
    error:
      "Add at least one color with a photo (upload or image URL). The main catalog image is taken from the default color.",
  };
}
