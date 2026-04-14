"use client";

import React, { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import websiteCategories from "@/components/Home/Categories/categoryData";
import { parseProductContent } from "@/lib/product-content";
import { updateProductFullAction, type UpdateProductState } from "./actions";
import {
  pf,
  productFormSectionIds,
  ProductFormField,
  ProductFormJumpNav,
  ProductFormSection,
  ProductImageDropZone,
} from "./product-form-ui";

export type AdminProductEditable = {
  id: string;
  title: string;
  slug: string;
  price: number;
  jomlaPrice: number | null;
  rating: number;
  instock: number;
  manufacturer: string;
  mainimage: string;
  categoryName: string;
  description: string;
};

const initialUpdateState: UpdateProductState = {};

type Props = {
  product: AdminProductEditable;
  onClose: () => void;
};

export default function EditProductModal({ product, onClose }: Props) {
  const router = useRouter();
  const [updateState, updateAction, isUpdating] = useActionState(updateProductFullAction, initialUpdateState);
  const [selectedFileName, setSelectedFileName] = useState("Keep current image");
  const [specRows, setSpecRows] = useState([
    { name: "", hasPriceOverride: false, options: [{ label: "", price: "" }] },
  ]);
  const [additionalRows, setAdditionalRows] = useState([{ key: "", value: "" }]);
  const [colorRows, setColorRows] = useState([{ name: "", price: "" }]);
  const [colorHasPriceOverride, setColorHasPriceOverride] = useState(false);
  const [editSoumaMode, setEditSoumaMode] = useState(false);
  const [editPriceInput, setEditPriceInput] = useState("");

  useEffect(() => {
    const parsed = parseProductContent(product.description);
    setSelectedFileName("Keep current image");
    setColorHasPriceOverride(Boolean(parsed.colorHasPriceOverride));
    const colors = parsed.colors?.length
      ? parsed.colors.map((c) => ({
          name: c.name,
          price: c.price != null && !Number.isNaN(c.price) ? String(c.price) : "",
        }))
      : [{ name: "", price: "" }];
    setColorRows(colors);
    if (parsed.specifications?.length) {
      setSpecRows(
        parsed.specifications.map((s) => ({
          name: s.name,
          hasPriceOverride: Boolean(s.hasPriceOverride),
          options:
            s.options?.map((o) => ({
              label: o.label,
              price: o.price != null && !Number.isNaN(o.price) ? String(o.price) : "",
            })) ?? [{ label: "", price: "" }],
        }))
      );
    } else {
      setSpecRows([{ name: "", hasPriceOverride: false, options: [{ label: "", price: "" }] }]);
    }
    if (parsed.additionalInfo?.length) {
      setAdditionalRows(parsed.additionalInfo.map((a) => ({ key: a.key, value: a.value })));
    } else {
      setAdditionalRows([{ key: "", value: "" }]);
    }
    const hasSouma = product.jomlaPrice != null;
    setEditSoumaMode(hasSouma);
    setEditPriceInput(hasSouma ? String(product.jomlaPrice) : String(product.price));
  }, [product]);

  useEffect(() => {
    if (updateState.success) {
      router.refresh();
      onClose();
    }
  }, [updateState.success, onClose, router]);

  const parsedForTextareas = parseProductContent(product.description);
  const categoryTitles = new Set(websiteCategories.map((c) => c.title));
  const hasCustomCategory = Boolean(product.categoryName) && !categoryTitles.has(product.categoryName);

  const editSoumaStandardPreview = useMemo(() => {
    const n = Number(editPriceInput);
    if (!editSoumaMode || Number.isNaN(n) || n <= 0) return null;
    return Math.round(Math.round(n) * 1.2);
  }, [editSoumaMode, editPriceInput]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-product-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/20"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-[#fff7ed]/35 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-dark-4">Editing</p>
            <h2 id="edit-product-title" className="mt-0.5 truncate text-lg font-semibold text-stone-900 sm:text-xl">
              {product.title}
            </h2>
            <p className="mt-1 text-xs text-dark-4 sm:text-sm">
              Changes apply immediately after you save. Use the shortcuts to move between sections.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-stone-200 bg-white p-2 text-stone-500 transition hover:border-[#FB923C] hover:text-stone-800"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form action={updateAction} encType="multipart/form-data" className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="productId" value={product.id} />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-stone-50/40 px-4 py-3 sm:px-6 sm:py-4">
            <ProductFormJumpNav className="!-mx-0 rounded-xl border border-stone-200/90 bg-white/95 px-3 py-3 sm:px-4" />

            <div className="mt-5 space-y-5 pb-4">
              <ProductFormSection
                id={productFormSectionIds.basics}
                title="Basics & pricing"
                description="Listing identity, classification, and inventory."
                badge="Required"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <ProductFormField label="Product title">
                    <input
                      name="title"
                      required
                      defaultValue={product.title}
                      className={pf.input}
                    />
                  </ProductFormField>
                  <ProductFormField label="Manufacturer / brand">
                    <input
                      name="manufacturer"
                      required
                      defaultValue={product.manufacturer}
                      className={pf.input}
                    />
                  </ProductFormField>
                  <ProductFormField label="Category">
                    <select
                      name="categoryName"
                      required
                      defaultValue={product.categoryName}
                      className={pf.select}
                    >
                      <option value="">Choose…</option>
                      {hasCustomCategory && (
                        <option value={product.categoryName}>{product.categoryName} (current)</option>
                      )}
                      {websiteCategories.map((category) => (
                        <option key={category.id} value={category.title}>
                          {category.title}
                        </option>
                      ))}
                    </select>
                  </ProductFormField>
                  <ProductFormField label="Rating" hint="0–5 stars display.">
                    <input
                      name="rating"
                      type="number"
                      min="0"
                      max="5"
                      required
                      defaultValue={product.rating}
                      className={pf.input}
                    />
                  </ProductFormField>

                  <div className="md:col-span-2">
                    <input type="hidden" name="soumaMode" value={editSoumaMode ? "true" : "false"} />
                    <div className={`${pf.cardMuted} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                      <div>
                        <p className="text-sm font-semibold text-stone-800">Souma pricing mode</p>
                        <p className="mt-0.5 text-xs text-dark-4">
                          On: enter Souma price; standard list price is +20%. Off: single standard price.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={editSoumaMode}
                        onClick={() => {
                          const n = Number(editPriceInput);
                          if (editSoumaMode) {
                            if (!Number.isNaN(n) && n > 0) {
                              setEditPriceInput(String(Math.round(n * 1.2)));
                            } else {
                              setEditPriceInput(String(product.price));
                            }
                            setEditSoumaMode(false);
                          } else {
                            if (!Number.isNaN(n) && n > 0) {
                              setEditPriceInput(String(Math.max(1, Math.round(n / 1.2))));
                            } else if (product.jomlaPrice != null) {
                              setEditPriceInput(String(product.jomlaPrice));
                            }
                            setEditSoumaMode(true);
                          }
                        }}
                        className={`relative inline-flex h-9 w-[3.25rem] shrink-0 items-center rounded-full border-2 border-transparent transition focus:outline-none focus:ring-2 focus:ring-blue/30 ${
                          editSoumaMode ? "bg-[#FB923C]" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition ${
                            editSoumaMode ? "translate-x-[1.35rem]" : "translate-x-0.5"
                          }`}
                        />
                        <span className="sr-only">{editSoumaMode ? "Souma mode on" : "Souma mode off"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:col-span-2">
                    <div>
                      <ProductFormField
                        label={editSoumaMode ? "Souma price (DA)" : "Standard price (DA)"}
                        hint={
                          editSoumaMode
                            ? "Standard (strikethrough) recalculated as +20% on save."
                            : "Clears Souma pricing — one price on the shop."
                        }
                      >
                        <input
                          name="price"
                          type="number"
                          min={editSoumaMode ? 1 : 0}
                          step="1"
                          required
                          value={editPriceInput}
                          onChange={(e) => setEditPriceInput(e.target.value)}
                          className={pf.input}
                        />
                      </ProductFormField>
                      {editSoumaMode && editSoumaStandardPreview != null ? (
                        <div className="mt-2 rounded-lg border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 text-sm text-stone-800">
                          <span className="text-dark-4">Standard reference (+20%): </span>
                          <span className="font-semibold tabular-nums">{editSoumaStandardPreview} DA</span>
                        </div>
                      ) : null}
                    </div>
                    <ProductFormField label="Stock quantity">
                      <input
                        name="instock"
                        type="number"
                        min="0"
                        required
                        defaultValue={product.instock}
                        className={pf.input}
                      />
                    </ProductFormField>
                  </div>
                </div>
              </ProductFormSection>

              <ProductFormSection
                id={productFormSectionIds.content}
                title="Description & care"
                description="Shown on the product detail view."
                badge="Required text"
              >
                <div className="space-y-5">
                  <ProductFormField label="Product overview">
                    <textarea
                      name="description"
                      required
                      rows={5}
                      key={`desc-${product.id}`}
                      defaultValue={parsedForTextareas.description}
                      className={pf.textarea}
                    />
                  </ProductFormField>
                  <ProductFormField label="Care & maintenance" hint="Optional.">
                    <textarea
                      name="careMaintenance"
                      rows={3}
                      key={`care-${product.id}`}
                      defaultValue={parsedForTextareas.careMaintenance ?? ""}
                      className={pf.textarea}
                      placeholder="How to care for this product"
                    />
                  </ProductFormField>
                </div>
              </ProductFormSection>

              <ProductFormSection
                id={productFormSectionIds.variants}
                title="Colors, specifications & extra fields"
                description="Same structure as when creating a product. Leave blocks empty if not needed."
              >
                <div className="space-y-6">
                  <div className={pf.cardMuted}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-800">Color options</p>
                        <p className="text-xs text-dark-4">Enable per-color pricing only if prices differ.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setColorRows((prev) => [...prev, { name: "", price: "" }])}
                        className={pf.btnAccent}
                      >
                        + Add color
                      </button>
                    </div>
                    <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-stone-300 text-blue focus:ring-blue"
                        checked={colorHasPriceOverride}
                        onChange={(event) => setColorHasPriceOverride(event.target.checked)}
                      />
                      Different price per color
                    </label>
                    <div className="space-y-2">
                      {colorRows.map((row, index) => (
                        <div
                          key={index}
                          className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 sm:flex-row sm:items-center"
                        >
                          <input
                            type="text"
                            placeholder="Color name"
                            value={row.name}
                            onChange={(event) =>
                              setColorRows((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item))
                              )
                            }
                            className={pf.input}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!colorHasPriceOverride}
                            placeholder="Price"
                            value={row.price}
                            onChange={(event) =>
                              setColorRows((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, price: event.target.value } : item))
                              )
                            }
                            className={`${pf.input} disabled:bg-stone-100`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setColorRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
                            }
                            className={pf.btnDanger}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      name="colors"
                      value={JSON.stringify(
                        colorRows
                          .map((row) => ({
                            name: row.name.trim(),
                            price:
                              colorHasPriceOverride && row.price !== "" ? Number(row.price) : undefined,
                          }))
                          .filter((row) => row.name)
                      )}
                    />
                    <input type="hidden" name="colorHasPriceOverride" value={String(colorHasPriceOverride)} />
                  </div>

                  <div className={pf.cardMuted}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-800">Specifications</p>
                        <p className="text-xs text-dark-4">Name + options; optional price per option.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSpecRows((prev) => [
                            ...prev,
                            { name: "", hasPriceOverride: false, options: [{ label: "", price: "" }] },
                          ])
                        }
                        className={pf.btnAccent}
                      >
                        + Add specification
                      </button>
                    </div>
                    <div className="space-y-4">
                      {specRows.map((row, index) => (
                        <div key={index} className={pf.innerCard}>
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="text"
                              placeholder="Spec name"
                              value={row.name}
                              onChange={(event) =>
                                setSpecRows((prev) =>
                                  prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item))
                                )
                              }
                              className={pf.input}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setSpecRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
                              }
                              className={pf.btnDanger}
                            >
                              Remove spec
                            </button>
                          </div>
                          <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-stone-300 text-blue focus:ring-blue"
                              checked={row.hasPriceOverride}
                              onChange={(event) =>
                                setSpecRows((prev) =>
                                  prev.map((item, i) =>
                                    i === index ? { ...item, hasPriceOverride: event.target.checked } : item
                                  )
                                )
                              }
                            />
                            Override price per option
                          </label>
                          <div className="space-y-2">
                            {row.options.map((option, optionIndex) => (
                              <div
                                key={optionIndex}
                                className="grid grid-cols-1 gap-2 border-t border-stone-100 pt-2 first:border-0 first:pt-0 md:grid-cols-[1fr_1fr_auto]"
                              >
                                <input
                                  type="text"
                                  placeholder="Option label"
                                  value={option.label}
                                  onChange={(event) =>
                                    setSpecRows((prev) =>
                                      prev.map((item, i) =>
                                        i === index
                                          ? {
                                              ...item,
                                              options: item.options.map((opt, oi) =>
                                                oi === optionIndex ? { ...opt, label: event.target.value } : opt
                                              ),
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className={pf.input}
                                />
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!row.hasPriceOverride}
                                  placeholder="Price"
                                  value={option.price}
                                  onChange={(event) =>
                                    setSpecRows((prev) =>
                                      prev.map((item, i) =>
                                        i === index
                                          ? {
                                              ...item,
                                              options: item.options.map((opt, oi) =>
                                                oi === optionIndex ? { ...opt, price: event.target.value } : opt
                                              ),
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className={`${pf.input} disabled:bg-stone-100`}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSpecRows((prev) =>
                                      prev.map((item, i) =>
                                        i === index
                                          ? {
                                              ...item,
                                              options:
                                                item.options.length === 1
                                                  ? item.options
                                                  : item.options.filter((_, oi) => oi !== optionIndex),
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className={pf.btnDanger}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSpecRows((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, options: [...item.options, { label: "", price: "" }] }
                                    : item
                                )
                              )
                            }
                            className={`${pf.btnAccent} mt-3`}
                          >
                            + Add option
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      name="specifications"
                      value={JSON.stringify(
                        specRows
                          .map((row) => ({
                            name: row.name.trim(),
                            hasPriceOverride: row.hasPriceOverride,
                            options: row.options
                              .map((option) => ({
                                label: option.label.trim(),
                                price:
                                  row.hasPriceOverride && option.price !== ""
                                    ? Number(option.price)
                                    : undefined,
                              }))
                              .filter((option) => option.label),
                          }))
                          .filter((row) => row.name && row.options.length > 0)
                      )}
                    />
                  </div>

                  <div className={pf.cardMuted}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-800">Additional information</p>
                        <p className="text-xs text-dark-4">Label / value rows for extra attributes.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdditionalRows((prev) => [...prev, { key: "", value: "" }])}
                        className={pf.btnAccent}
                      >
                        + Add row
                      </button>
                    </div>
                    <div className="space-y-2">
                      {additionalRows.map((row, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 gap-2 rounded-lg border border-stone-200 bg-white p-3 md:grid-cols-[1fr_1fr_auto]"
                        >
                          <input
                            type="text"
                            placeholder="Label"
                            value={row.key}
                            onChange={(event) =>
                              setAdditionalRows((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, key: event.target.value } : item))
                              )
                            }
                            className={pf.input}
                          />
                          <input
                            type="text"
                            placeholder="Value"
                            value={row.value}
                            onChange={(event) =>
                              setAdditionalRows((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, value: event.target.value } : item))
                              )
                            }
                            className={pf.input}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setAdditionalRows((prev) =>
                                prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
                              )
                            }
                            className={pf.btnDanger}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      name="additionalInfo"
                      value={JSON.stringify(
                        additionalRows
                          .map((row) => ({ key: row.key.trim(), value: row.value.trim() }))
                          .filter((row) => row.key && row.value)
                      )}
                    />
                  </div>
                </div>
              </ProductFormSection>

              <ProductFormSection
                id={productFormSectionIds.media}
                title="Main image"
                description="Replace the photo only if needed; otherwise leave the file picker unchanged."
              >
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start">
                  <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-dark-4">Current</p>
                    <div className="mt-2 aspect-square overflow-hidden rounded-lg bg-stone-100">
                      <img
                        src={product.mainimage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div>
                    <ProductImageDropZone
                      inputId="edit-product-image"
                      fileName={selectedFileName}
                      onFileChange={(file) => setSelectedFileName(file?.name ?? "Keep current image")}
                      helper="Optional. Supported: JPG, PNG, WebP, GIF. Replaces the main listing image."
                    />
                  </div>
                </div>
              </ProductFormSection>
            </div>

            {updateState.error ? (
              <p className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
                {updateState.error}
              </p>
            ) : null}
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-stone-200 bg-white px-4 py-4 sm:px-6">
            <button type="button" onClick={onClose} className={pf.btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={isUpdating} className={pf.btnPrimary}>
              {isUpdating ? "Saving…" : "Save changes"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
