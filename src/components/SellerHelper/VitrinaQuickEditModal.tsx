"use client";

import Image from "next/image";
import React, { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import websiteCategories from "@/components/Home/Categories/categoryData";
import { parseProductContent } from "@/lib/product-content";
import type { VitrinaProductMarketingRecommendation } from "@/types/vitrina-product-recommendations";
import { updateProductFullAction, type UpdateProductState } from "@/app/(site)/(pages)/admin/actions";
import { sellerGhostButton, sellerPrimaryButton, sellerSecondaryButton } from "./layout";

const initialUpdateState: UpdateProductState = {};

const fieldClass =
  "w-full rounded-lg border border-gray-3 bg-white px-3 py-2 text-custom-sm text-dark outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/15";

type ColorRow = {
  name: string;
  price: string;
  imageUrl?: string;
};

function buildInitialColorRows(colors: ReturnType<typeof parseProductContent>["colors"]): ColorRow[] {
  const rows = colors
    .map((color) => ({
      name: color.name,
      price: color.price != null && !Number.isNaN(color.price) ? String(color.price) : "",
      imageUrl: color.imageUrl?.trim() ?? "",
    }))
    .filter((color) => color.name.trim());

  return rows.length > 0 ? rows : [{ name: "", price: "", imageUrl: "" }];
}

function buildColorsPayload(rows: ColorRow[], defaultColorName: string, colorHasPriceOverride: boolean) {
  const enriched = rows
    .map((row, rowIndex) => ({
      rowIndex,
      name: row.name.trim(),
      price: colorHasPriceOverride && row.price !== "" ? Number(row.price) : undefined,
      ...(row.imageUrl?.trim() ? { imageUrl: row.imageUrl.trim() } : {}),
    }))
    .filter((row) => row.name);

  if (enriched.length === 0) return [];

  const resolvedDefaultName = defaultColorName.trim() || enriched[0].name;
  const defaultIndex = enriched.findIndex((row) => row.name === resolvedDefaultName);
  if (defaultIndex <= 0) return enriched;

  const reordered = [...enriched];
  const [defaultColor] = reordered.splice(defaultIndex, 1);
  return [defaultColor, ...reordered];
}

type Props = {
  product: VitrinaProductMarketingRecommendation;
  onClose: () => void;
};

export default function VitrinaQuickEditModal({ product, onClose }: Props) {
  const router = useRouter();
  const [updateState, updateAction, isUpdating] = useActionState(updateProductFullAction, initialUpdateState);
  const parsed = useMemo(() => parseProductContent(product.description), [product.description]);
  const [editVitrinaMode, setEditVitrinaMode] = useState(product.jomlaPrice != null);
  const [editPriceInput, setEditPriceInput] = useState(
    product.jomlaPrice != null ? String(product.jomlaPrice) : String(product.price)
  );
  const [selectedFileName, setSelectedFileName] = useState("Keep current image");
  const [colorRows, setColorRows] = useState<ColorRow[]>(() => buildInitialColorRows(parsed.colors));
  const [colorHasPriceOverride, setColorHasPriceOverride] = useState(Boolean(parsed.colorHasPriceOverride));
  const [defaultColorName, setDefaultColorName] = useState(parsed.colors[0]?.name ?? "");

  const categoryTitles = new Set(websiteCategories.map((category) => category.title));
  const hasCustomCategory = Boolean(product.categoryName) && !categoryTitles.has(product.categoryName);

  const editVitrinaStandardPreview = useMemo(() => {
    const value = Number(editPriceInput);
    if (!editVitrinaMode || Number.isNaN(value) || value <= 0) return null;
    return Math.round(Math.round(value) * 1.2);
  }, [editPriceInput, editVitrinaMode]);

  useEffect(() => {
    setColorRows(buildInitialColorRows(parsed.colors));
    setColorHasPriceOverride(Boolean(parsed.colorHasPriceOverride));
    setDefaultColorName(parsed.colors[0]?.name ?? "");
  }, [parsed, product.productId]);

  useEffect(() => {
    if (!updateState.success) return;
    router.refresh();
    onClose();
  }, [onClose, router, updateState.success]);

  const colorsPayload = useMemo(
    () => buildColorsPayload(colorRows, defaultColorName, colorHasPriceOverride),
    [colorHasPriceOverride, colorRows, defaultColorName]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/55 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vitrina-quick-edit-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-3 bg-white shadow-1"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-3 bg-gray-1 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-dark-4">Quick edit</p>
            <h2 id="vitrina-quick-edit-title" className="mt-0.5 truncate text-lg font-semibold text-dark">
              {product.title}
            </h2>
            <p className="mt-1 text-custom-sm text-dark-4">
              Adjust storefront marketing fields without opening the full admin.
            </p>
          </div>
          <button type="button" onClick={onClose} className={sellerGhostButton} aria-label="Close">
            Close
          </button>
        </header>

        <form action={updateAction} encType="multipart/form-data" className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="productId" value={product.productId} />
          <input type="hidden" name="vitrinaMode" value={editVitrinaMode ? "true" : "false"} />
          <input type="hidden" name="careMaintenance" value={parsed.careMaintenance ?? ""} />
          <input type="hidden" name="colors" value={JSON.stringify(colorsPayload)} />
          <input type="hidden" name="colorHasPriceOverride" value={colorHasPriceOverride ? "true" : "false"} />
          <input type="hidden" name="specifications" value={JSON.stringify(parsed.specifications ?? [])} />
          <input type="hidden" name="additionalInfo" value={JSON.stringify(parsed.additionalInfo ?? [])} />

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-4 rounded-lg border border-gray-3 bg-gray-1 p-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-3 bg-white">
                <Image src={product.mainimage} alt={product.title} fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-custom-sm font-medium text-dark">{product.categoryName}</p>
                <p className="text-xs text-dark-4">Current stock: {product.instock}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-custom-sm font-medium text-dark">Product title</span>
                <input name="title" required defaultValue={product.title} className={fieldClass} />
              </label>

              <label className="space-y-1.5">
                <span className="text-custom-sm font-medium text-dark">Brand</span>
                <input name="manufacturer" required defaultValue={product.manufacturer} className={fieldClass} />
              </label>

              <label className="space-y-1.5">
                <span className="text-custom-sm font-medium text-dark">Category</span>
                <select name="categoryName" required defaultValue={product.categoryName} className={fieldClass}>
                  <option value="">Choose…</option>
                  {hasCustomCategory ? <option value={product.categoryName}>{product.categoryName} (current)</option> : null}
                  {websiteCategories.map((category) => (
                    <option key={category.id} value={category.title}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-custom-sm font-medium text-dark">Rating</span>
                <input
                  name="rating"
                  type="number"
                  min={0}
                  max={5}
                  required
                  defaultValue={product.rating}
                  className={fieldClass}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-custom-sm font-medium text-dark">Stock</span>
                <input
                  name="instock"
                  type="number"
                  min={0}
                  required
                  defaultValue={product.instock}
                  className={fieldClass}
                />
              </label>

              <div className="space-y-3 rounded-lg border border-gray-3 bg-gray-1 p-3 sm:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-custom-sm font-medium text-dark">Vitrina pricing mode</p>
                    <p className="text-xs text-dark-4">Enabled: promo price plus strikethrough price (+20%).</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editVitrinaMode}
                    onClick={() => {
                      const value = Number(editPriceInput);
                      if (editVitrinaMode) {
                        if (!Number.isNaN(value) && value > 0) {
                          setEditPriceInput(String(Math.round(value * 1.2)));
                        } else {
                          setEditPriceInput(String(product.price));
                        }
                        setEditVitrinaMode(false);
                        return;
                      }

                      if (!Number.isNaN(value) && value > 0) {
                        setEditPriceInput(String(Math.max(1, Math.round(value / 1.2))));
                      } else if (product.jomlaPrice != null) {
                        setEditPriceInput(String(product.jomlaPrice));
                      }
                      setEditVitrinaMode(true);
                    }}
                    className={`relative inline-flex h-9 w-[3.25rem] shrink-0 items-center rounded-full border-2 border-transparent transition ${
                      editVitrinaMode ? "bg-orange" : "bg-gray-4"
                    }`}
                  >
                    <span
                      className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition ${
                        editVitrinaMode ? "translate-x-[1.35rem]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-custom-sm font-medium text-dark">
                    {editVitrinaMode ? "Vitrina price (DA)" : "Standard price (DA)"}
                  </span>
                  <input
                    name="price"
                    type="number"
                    min={editVitrinaMode ? 1 : 0}
                    step={1}
                    required
                    value={editPriceInput}
                    onChange={(event) => setEditPriceInput(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                {editVitrinaMode && editVitrinaStandardPreview != null ? (
                  <p className="text-custom-sm text-dark-4">
                    Estimated strikethrough price:{" "}
                    <span className="font-semibold tabular-nums text-dark">{editVitrinaStandardPreview} DA</span>
                  </p>
                ) : null}
              </div>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-custom-sm font-medium text-dark">Short description</span>
                <textarea
                  name="description"
                  required
                  rows={4}
                  defaultValue={parsed.description}
                  className={fieldClass}
                />
              </label>

              <div className="space-y-3 rounded-lg border border-gray-3 bg-gray-1 p-3 sm:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-custom-sm font-medium text-dark">Colors</p>
                    <p className="text-xs text-dark-4">
                      The default color is preselected on the product page.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setColorRows((previous) => [...previous, { name: "", price: "", imageUrl: "" }])}
                    className={sellerSecondaryButton}
                  >
                    Add a color
                  </button>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-custom-sm text-dark-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-3 text-orange outline-none focus:ring-2 focus:ring-orange/15"
                    checked={colorHasPriceOverride}
                    onChange={(event) => setColorHasPriceOverride(event.target.checked)}
                  />
                  Different price per color
                </label>

                <div className="space-y-2">
                  {colorRows.map((row, index) => {
                    const trimmedName = row.name.trim();
                    const isDefault = trimmedName.length > 0 && trimmedName === defaultColorName;

                    return (
                      <div
                        key={`color-${index}`}
                        className="flex flex-col gap-2 rounded-lg border border-gray-3 bg-white p-3 sm:flex-row sm:items-center"
                      >
                        <input
                          type="text"
                          placeholder="Color name"
                          value={row.name}
                          onChange={(event) => {
                            const nextName = event.target.value;
                            setColorRows((previous) =>
                              previous.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, name: nextName } : item
                              )
                            );
                            if (defaultColorName === row.name.trim()) {
                              setDefaultColorName(nextName.trim());
                            }
                          }}
                          className={fieldClass}
                        />
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          disabled={!colorHasPriceOverride}
                          placeholder="Price"
                          value={row.price}
                          onChange={(event) =>
                            setColorRows((previous) =>
                              previous.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, price: event.target.value } : item
                              )
                            )
                          }
                          className={`${fieldClass} disabled:bg-gray-1`}
                        />
                        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-dark-4 sm:max-w-[200px]">
                          <span className="text-custom-sm font-medium text-dark-3">Variant photo</span>
                          <input
                            type="file"
                            name={`colorImage_${index}`}
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="block w-full text-custom-sm text-dark-4 file:mr-2 file:rounded file:border-0 file:bg-orange file:px-2 file:py-1 file:text-xs file:font-medium file:text-white"
                          />
                        </label>
                        <label className="inline-flex shrink-0 items-center gap-2 text-custom-sm text-dark-3">
                          <input
                            type="radio"
                            name="defaultColor"
                            checked={isDefault}
                            disabled={trimmedName.length === 0}
                            onChange={() => setDefaultColorName(trimmedName)}
                          />
                          Default
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setColorRows((previous) => {
                              if (previous.length === 1) return [{ name: "", price: "", imageUrl: "" }];
                              const next = previous.filter((_, itemIndex) => itemIndex !== index);
                              if (defaultColorName === row.name.trim()) {
                                setDefaultColorName(next[0]?.name.trim() ?? "");
                              }
                              return next;
                            })
                          }
                          className={sellerGhostButton}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-custom-sm font-medium text-dark">Main image</span>
                <input
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="block w-full text-custom-sm text-dark-4 file:mr-3 file:rounded-md file:border-0 file:bg-orange file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-white file:ease-out file:duration-200 hover:file:bg-orange-dark"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setSelectedFileName(file?.name ?? "Keep current image");
                  }}
                />
                <p className="text-xs text-dark-4">{selectedFileName}</p>
              </label>
            </div>

            {updateState.error ? (
              <p className="rounded-lg border border-red-light-3 bg-red-light-6 px-3 py-2 text-custom-sm text-red-dark">
                {updateState.error}
              </p>
            ) : null}
          </div>

          <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-3 bg-gray-1 px-4 py-4 sm:px-6">
            <button type="button" onClick={onClose} className={sellerSecondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={isUpdating} className={sellerPrimaryButton}>
              {isUpdating ? "Saving…" : "Save"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
