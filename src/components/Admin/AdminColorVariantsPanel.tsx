"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { buildColorsPayload } from "@/lib/admin-product-colors";
import { adminPf } from "@/app/(site)/(pages)/(admin-shell)/admin/product-form-ui";

export type AdminColorFormRow = {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
};

export function newAdminColorFormRow(): AdminColorFormRow {
  return { id: crypto.randomUUID(), name: "", price: "", imageUrl: "" };
}

type Props = {
  colorRows: AdminColorFormRow[];
  setColorRows: React.Dispatch<React.SetStateAction<AdminColorFormRow[]>>;
  defaultColorName: string;
  setDefaultColorName: (name: string) => void;
  colorHasPriceOverride: boolean;
  setColorHasPriceOverride: (value: boolean) => void;
  /** Shown on edit when a color already has a stored image URL */
  previewMainImageUrl?: string | null;
};

export default function AdminColorVariantsPanel({
  colorRows,
  setColorRows,
  defaultColorName,
  setDefaultColorName,
  colorHasPriceOverride,
  setColorHasPriceOverride,
  previewMainImageUrl,
}: Props) {
  const colorsPayload = buildColorsPayload(
    colorRows.map((row) => ({
      rowKey: row.id,
      name: row.name,
      price: colorHasPriceOverride && row.price !== "" ? Number(row.price) : undefined,
      imageUrl: row.imageUrl?.trim() || undefined,
    })),
    defaultColorName
  );

  const resolvedDefault =
    defaultColorName.trim() ||
    colorRows.find((r) => r.name.trim())?.name.trim() ||
    "";

  const listingPreviewUrl =
    colorsPayload.find((c) => c.name === resolvedDefault)?.imageUrl ||
    colorsPayload.find((c) => c.imageUrl)?.imageUrl ||
    previewMainImageUrl ||
    null;

  return (
    <div className={adminPf.panelMuted}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-dark">Colors & catalog image</p>
          <p className="mt-1 text-custom-sm text-dark-4">
            Each color needs a name and a photo. Pick which color is the <strong className="font-medium text-dark">default</strong> —
            its image is used on shop listings and as the first image on the product page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const row = newAdminColorFormRow();
            setColorRows((prev) => [...prev, row]);
            if (!resolvedDefault) setDefaultColorName(row.name);
          }}
          className={adminPf.btnAccent}
        >
          + Add color
        </button>
      </div>

      {listingPreviewUrl ?
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-gray-3 bg-white p-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-1">
            <Image src={listingPreviewUrl} alt="" fill sizes="56px" className="object-cover" unoptimized />
          </div>
          <div className="min-w-0 text-custom-sm">
            <p className="font-medium text-dark">Listing preview</p>
            <p className="text-dark-4 truncate">From default color: {resolvedDefault || "—"}</p>
          </div>
        </div>
      : null}

      <label className="mb-4 flex cursor-pointer items-center gap-2 text-custom-sm text-dark-3">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-3 text-orange outline-none focus-visible:ring-0"
          checked={colorHasPriceOverride}
          onChange={(event) => setColorHasPriceOverride(event.target.checked)}
        />
        Different price per color
      </label>

      <div className="space-y-3">
        {colorRows.map((row) => {
          const trimmedName = row.name.trim();
          const isDefault = trimmedName.length > 0 && trimmedName === resolvedDefault;
          return (
            <div
              key={row.id}
              className={cn(
                adminPf.innerCard,
                isDefault && "border-orange/40 ring-1 ring-orange/25"
              )}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-3 pb-3">
                <label className="flex cursor-pointer items-center gap-2 text-custom-sm font-medium text-dark">
                  <input
                    type="radio"
                    name="defaultColor"
                    className="h-4 w-4 border-gray-3 text-orange outline-none focus-visible:ring-0"
                    checked={isDefault}
                    disabled={!trimmedName}
                    onChange={() => setDefaultColorName(trimmedName)}
                  />
                  <span>
                    Default color
                    {isDefault ?
                      <span className="ml-2 rounded-md bg-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-dark">
                        Main image
                      </span>
                    : null}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setColorRows((prev) => {
                      if (prev.length === 1) return prev;
                      const next = prev.filter((item) => item.id !== row.id);
                      if (isDefault) {
                        const first = next.find((item) => item.name.trim());
                        if (first) setDefaultColorName(first.name.trim());
                      }
                      return next;
                    });
                  }}
                  className={adminPf.btnDanger}
                >
                  Remove
                </button>
              </div>

              <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-custom-sm text-dark-3">
                  <span className="font-medium text-dark">Color name</span>
                  <input
                    type="text"
                    required={colorRows.length <= 1}
                    value={row.name}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      setColorRows((prev) =>
                        prev.map((item) => (item.id === row.id ? { ...item, name: nextName } : item))
                      );
                      if (isDefault) setDefaultColorName(nextName.trim());
                    }}
                    className={adminPf.input}
                  />
                </label>
                <label className="flex flex-col gap-1 text-custom-sm text-dark-3">
                  <span className="font-medium text-dark">
                    {colorHasPriceOverride ? "Price (DZD)" : "Price"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!colorHasPriceOverride}
                    value={row.price}
                    onChange={(event) =>
                      setColorRows((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, price: event.target.value } : item
                        )
                      )
                    }
                    className={cn(adminPf.input, "disabled:bg-gray-1 disabled:text-dark-4")}
                  />
                </label>
                <label className="flex flex-col gap-1 text-custom-sm text-dark-3 sm:col-span-2">
                  <span className="font-medium text-dark">Image URL</span>
                  <span className="text-[11px] text-dark-4">Or upload a file below (upload replaces URL).</span>
                  <input
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    value={row.imageUrl}
                    onChange={(event) =>
                      setColorRows((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, imageUrl: event.target.value } : item
                        )
                      )
                    }
                    className={adminPf.input}
                  />
                </label>
                <label className="flex flex-col gap-1 text-custom-sm text-dark-3 sm:col-span-2">
                  <span className="font-medium text-dark">Upload photo</span>
                  <input
                    type="file"
                    name={`colorImage_${row.id}`}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="text-custom-sm file:mr-2 file:rounded-md file:border-0 file:bg-orange file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <input type="hidden" name="colors" value={JSON.stringify(colorsPayload)} />
      <input type="hidden" name="defaultColorName" value={resolvedDefault} />
      <input type="hidden" name="colorHasPriceOverride" value={String(colorHasPriceOverride)} />
    </div>
  );
}
