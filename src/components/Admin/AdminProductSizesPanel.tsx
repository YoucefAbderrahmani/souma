"use client";

import { adminPf } from "@/app/(site)/(pages)/(admin-shell)/admin/product-form-ui";
import { buildSizesPayload, newAdminSizeFormRow, type AdminSizeFormRow } from "@/lib/admin-product-sizes";

type Props = {
  sizesEnabled: boolean;
  setSizesEnabled: (value: boolean) => void;
  sizeHasPriceOverride: boolean;
  setSizeHasPriceOverride: (value: boolean) => void;
  sizeRows: AdminSizeFormRow[];
  setSizeRows: React.Dispatch<React.SetStateAction<AdminSizeFormRow[]>>;
};

export default function AdminProductSizesPanel({
  sizesEnabled,
  setSizesEnabled,
  sizeHasPriceOverride,
  setSizeHasPriceOverride,
  sizeRows,
  setSizeRows,
}: Props) {
  const sizesPayload = buildSizesPayload(
    sizeRows.map((row) => ({
      label: row.label,
      price: sizeHasPriceOverride && row.price !== "" ? Number(row.price) : undefined,
    }))
  );

  return (
    <div className={adminPf.panelMuted}>
      <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-3 bg-white p-4">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-gray-3 text-orange outline-none focus-visible:ring-0"
          checked={sizesEnabled}
          onChange={(event) => {
            const next = event.target.checked;
            setSizesEnabled(next);
            if (next && sizeRows.every((row) => !row.label.trim())) {
              setSizeRows([newAdminSizeFormRow(), newAdminSizeFormRow(), newAdminSizeFormRow()]);
            }
          }}
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-dark">Enable size selection</span>
          <span className="mt-1 block text-custom-sm text-dark-4">
            Turn on for apparel, shoes, and other products sold in multiple sizes. Shoppers pick a size on
            the product page before adding to cart.
          </span>
        </span>
      </label>

      <input type="hidden" name="sizesEnabled" value={sizesEnabled ? "true" : "false"} />

      {sizesEnabled ?
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dark">Size options</p>
              <p className="mt-1 text-custom-sm text-dark-4">
                Add labels such as S, M, L, XL, or 40, 41, 42. At least one size is required when enabled.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSizeRows((prev) => [...prev, newAdminSizeFormRow()])}
              className={adminPf.btnAccent}
            >
              + Add size
            </button>
          </div>

          <label className="mb-4 flex cursor-pointer items-center gap-2 text-custom-sm text-dark-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-3 text-orange outline-none focus-visible:ring-0"
              checked={sizeHasPriceOverride}
              onChange={(event) => setSizeHasPriceOverride(event.target.checked)}
            />
            Different price per size
          </label>
          <input
            type="hidden"
            name="sizeHasPriceOverride"
            value={sizeHasPriceOverride ? "true" : "false"}
          />

          <div className="space-y-3">
            {sizeRows.map((row, index) => (
              <div
                key={row.id}
                className="grid grid-cols-1 gap-2 rounded-lg border border-gray-3 bg-white p-3 md:grid-cols-[1fr_1fr_auto]"
              >
                <input
                  type="text"
                  placeholder="Size label (e.g. M)"
                  value={row.label}
                  onChange={(event) =>
                    setSizeRows((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, label: event.target.value } : item))
                    )
                  }
                  className={adminPf.input}
                  required={sizesEnabled}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={sizeHasPriceOverride ? "Price (DA)" : "Uses base price"}
                  disabled={!sizeHasPriceOverride}
                  value={row.price}
                  onChange={(event) =>
                    setSizeRows((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, price: event.target.value } : item))
                    )
                  }
                  className={`${adminPf.input} disabled:bg-gray-1`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setSizeRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
                  }
                  className={adminPf.btnDanger}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <input type="hidden" name="sizes" value={JSON.stringify(sizesPayload)} />
        </>
      : (
        <input type="hidden" name="sizes" value="[]" />
      )}
    </div>
  );
}
