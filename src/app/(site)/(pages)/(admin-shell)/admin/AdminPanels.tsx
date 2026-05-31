"use client";

import React, { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { AdminTabBar, type AdminMainTab } from "./AdminTabBar";
import {
  ADMIN_TAB_SELECT_EVENT,
  navigateAdminTab,
  readAdminTabFromUrl,
} from "./admin-tab-client-nav";
import { InstantPanel } from "@/components/ui/InstantPanel";
import { createProductAction, type CreateProductState } from "./actions";
import websiteCategories from "@/components/Home/Categories/categoryData";
import AdminDeleteProductButton from "@/components/Admin/AdminDeleteProductButton";
import EditProductModal from "./EditProductModal";
import ProductAnalyticsTrackingPanel from "@/components/Admin/ProductAnalyticsTrackingPanel";
import RecommendationRoleEmailsPanel from "@/components/Admin/RecommendationRoleEmailsPanel";
import AdminRoleManagementPanel from "@/components/Admin/AdminRoleManagementPanel";
import { normalizeUserRole } from "@/lib/user-roles";
import SellerHelperDashboard from "@/components/SellerHelper/SellerHelperDashboard";
import type { ConceptionAdminInitialData } from "@/hooks/useConceptionAdminData";
import AdminColorVariantsPanel, {
  newAdminColorFormRow,
} from "@/components/Admin/AdminColorVariantsPanel";
import AdminProductSizesPanel from "@/components/Admin/AdminProductSizesPanel";
import { newAdminSizeFormRow } from "@/lib/admin-product-sizes";
import {
  pf,
  productFormSectionIds,
  ProductFormField,
  ProductFormSection,
  ProductFormShell,
} from "./product-form-ui";

type AdminUser = {
  id: string;
  name: string;
  lastname: string;
  email: string;
  role: string;
  createdAt: string;
};

type AdminProduct = {
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

type Props = {
  users: AdminUser[];
  products: AdminProduct[];
  conceptionInitialData?: ConceptionAdminInitialData;
  conceptionInitialError?: string | null;
  /** Only true for `admin` (not `seller`). */
  canManageRoles?: boolean;
  actorEmail?: string | null;
};

const initialState: CreateProductState = {};

export default function AdminPanels({
  users,
  products,
  conceptionInitialData,
  conceptionInitialError = null,
  canManageRoles = false,
  actorEmail = null,
}: Props) {
  const [activeTab, setActiveTab] = useState<AdminMainTab>(() =>
    typeof window === "undefined" ? "users" : readAdminTabFromUrl()
  );
  const [visitedTabs, setVisitedTabs] = useState<Set<AdminMainTab>>(
    () => new Set([typeof window === "undefined" ? "users" : readAdminTabFromUrl()])
  );
  const [createState, createAction, isCreating] = useActionState(createProductAction, initialState);
  const [specRows, setSpecRows] = useState([
    { name: "", hasPriceOverride: false, options: [{ label: "", price: "" }] },
  ]);
  const [additionalRows, setAdditionalRows] = useState([{ key: "", value: "" }]);
  const [colorRows, setColorRows] = useState(() => [newAdminColorFormRow()]);
  const [defaultColorName, setDefaultColorName] = useState("");
  const [colorHasPriceOverride, setColorHasPriceOverride] = useState(false);
  const [sizesEnabled, setSizesEnabled] = useState(false);
  const [sizeHasPriceOverride, setSizeHasPriceOverride] = useState(false);
  const [sizeRows, setSizeRows] = useState(() => [newAdminSizeFormRow()]);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [productCategoryTab, setProductCategoryTab] = useState<string>("__all__");
  const [userQuery, setUserQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [addVitrinaMode, setAddVitrinaMode] = useState(false);
  const [addPriceInput, setAddPriceInput] = useState("");

  const userStats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => normalizeUserRole(u.role) === "admin").length;
    const sellers = users.filter((u) => normalizeUserRole(u.role) === "seller").length;
    const regularUsers = users.filter((u) => normalizeUserRole(u.role) === "user").length;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const joinedLast30Days = users.filter((u) => new Date(u.createdAt).getTime() >= thirtyDaysAgo).length;
    return { total, admins, sellers, regularUsers, joinedLast30Days };
  }, [users]);

  const productStats = useMemo(() => {
    const total = products.length;
    const totalStock = products.reduce((acc, p) => acc + p.instock, 0);
    const lowStock = products.filter((p) => p.instock <= 5).length;
    const averagePrice = total ? Math.round(products.reduce((acc, p) => acc + p.price, 0) / total) : 0;
    return { total, totalStock, lowStock, averagePrice };
  }, [products]);

  const productCategoryNames = useMemo(() => {
    const names = Array.from(new Set(products.map((p) => p.categoryName).filter(Boolean)));
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [products]);

  const filteredProductsByCategoryTab = useMemo(() => {
    if (productCategoryTab === "__all__") return products;
    return products.filter((p) => p.categoryName === productCategoryTab);
  }, [products, productCategoryTab]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.name} ${u.lastname} ${u.email} ${u.role}`.toLowerCase().includes(q)
    );
  }, [users, userQuery]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return filteredProductsByCategoryTab;
    return filteredProductsByCategoryTab.filter((p) =>
      `${p.title} ${p.categoryName} ${p.manufacturer} ${p.slug}`.toLowerCase().includes(q)
    );
  }, [filteredProductsByCategoryTab, productQuery]);

  const addVitrinaStandardPreview = useMemo(() => {
    const n = Number(addPriceInput);
    if (!addVitrinaMode || Number.isNaN(n) || n <= 0) return null;
    return Math.round(Math.round(n) * 1.2);
  }, [addVitrinaMode, addPriceInput]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "conception") {
      window.history.replaceState(null, "", "/admin?tab=seller-helper");
    }
  }, []);

  const applyTab = useCallback((tab: AdminMainTab) => {
    setActiveTab(tab);
    setVisitedTabs((current) => {
      const next = new Set(current);
      next.add(tab);
      return next;
    });
  }, []);

  useEffect(() => {
    const onTabSelect = (event: Event) => {
      const tab = (event as CustomEvent<{ tab: AdminMainTab }>).detail.tab;
      applyTab(tab);
    };
    const onPopState = () => applyTab(readAdminTabFromUrl());
    window.addEventListener(ADMIN_TAB_SELECT_EVENT, onTabSelect);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener(ADMIN_TAB_SELECT_EVENT, onTabSelect);
      window.removeEventListener("popstate", onPopState);
    };
  }, [applyTab]);

  const renderTab = (tab: AdminMainTab, content: React.ReactNode) => {
    if (!visitedTabs.has(tab)) return null;
    return (
      <InstantPanel active={activeTab === tab} mounted panelId={`admin-tab-${tab}`}>
        {content}
      </InstantPanel>
    );
  };

  useEffect(() => {
    if (productCategoryTab === "__all__") return;
    if (!productCategoryNames.includes(productCategoryTab)) {
      setProductCategoryTab("__all__");
    }
  }, [productCategoryTab, productCategoryNames]);

  const onSelectTab = useCallback((tab: AdminMainTab) => {
    navigateAdminTab(tab);
  }, []);

  return (
    <div className="mt-10 space-y-6">
      <AdminTabBar
        activeTab={activeTab}
        onSelect={onSelectTab}
        showRoleManagement={canManageRoles}
      />

      <div className="relative mt-6 min-h-[240px]">
        {renderTab(
          "seller-helper",
          <section>
            <SellerHelperDashboard
              variant="admin"
              initialData={conceptionInitialData}
              initialError={conceptionInitialError}
            />
          </section>
        )}

        {canManageRoles
          ? renderTab(
              "role-management",
              <AdminRoleManagementPanel users={users} actorEmail={actorEmail} />
            )
          : null}

        {renderTab(
          "users",
          <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total Users" value={userStats.total} />
            <StatCard label="Admins" value={userStats.admins} />
            <StatCard label="Sellers" value={userStats.sellers} />
            <StatCard label="Customers" value={userStats.regularUsers} />
            <StatCard label="Joined (Last 30 Days)" value={userStats.joinedLast30Days} />
          </div>

          <div className="mt-6 rounded-lg border border-gray-3 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-medium text-dark">All users</h2>
              <input
                type="search"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search name, email, role"
                className="w-full rounded-md border border-gray-3 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-stone-500 focus:border-[#FB923C] focus:outline-none focus-visible:outline-none focus-visible:ring-0 sm:w-[280px]"
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-gray-3 text-xs uppercase tracking-wide text-dark-4">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-dark-4">
                        No users match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-gray-2 text-sm text-dark last:border-0">
                      <td className="py-3 pr-4">{u.name} {u.lastname}</td>
                      <td className="py-3 pr-4">{u.email}</td>
                      <td className="py-3 pr-4">{u.role}</td>
                      <td className="py-3">{new Date(u.createdAt).toLocaleDateString("en-US")}</td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </section>
        )}

        {renderTab(
          "add-product",
          <section>
          <form action={createAction} encType="multipart/form-data">
            <ProductFormShell
              title="Add new product"
              subtitle="Use the shortcuts below to jump between sections. Required fields are marked; optional blocks can be left empty."
              footer={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-dark-4">
                    Tip: finish basics and image first; you can add colors and specs later by editing the product.
                  </p>
                  <button type="submit" disabled={isCreating} className={pf.btnPrimary}>
                    {isCreating ? "Creating…" : "Publish product"}
                  </button>
                </div>
              }
            >
              <ProductFormSection
                id={productFormSectionIds.basics}
                title="Basics & pricing"
                description="What shoppers see in listings and how the item is classified."
                badge="Required"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <ProductFormField label="Product title" hint="Clear, specific name (e.g. model or size if relevant).">
                    <input name="title" required className={pf.input} />
                  </ProductFormField>
                  <ProductFormField label="Manufacturer / brand">
                    <input name="manufacturer" required className={pf.input} />
                  </ProductFormField>
                  <ProductFormField label="Category">
                    <select name="categoryName" required className={pf.select}>
                      <option value=""></option>
                      {websiteCategories.map((category) => (
                        <option key={category.id} value={category.title}>
                          {category.title}
                        </option>
                      ))}
                    </select>
                  </ProductFormField>

                  <div className="md:col-span-2">
                    <input type="hidden" name="vitrinaMode" value={addVitrinaMode ? "true" : "false"} />
                    <div className={`${pf.cardMuted} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                      <div>
                        <p className="text-sm font-semibold text-stone-800">Vitrina pricing mode</p>
                        <p className="mt-0.5 text-xs text-dark-4">
                          On: you enter the Vitrina price; the standard list price is set automatically (+20%). Off: one
                          standard price only.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={addVitrinaMode}
                        onClick={() => {
                          const n = Number(addPriceInput);
                          if (addVitrinaMode) {
                            if (!Number.isNaN(n) && n > 0) {
                              setAddPriceInput(String(Math.round(n * 1.2)));
                            }
                            setAddVitrinaMode(false);
                          } else {
                            if (!Number.isNaN(n) && n > 0) {
                              setAddPriceInput(String(Math.max(1, Math.round(n / 1.2))));
                            }
                            setAddVitrinaMode(true);
                          }
                        }}
                        className={`relative inline-flex h-9 w-[3.25rem] shrink-0 items-center rounded-full border-2 border-transparent transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                          addVitrinaMode ? "bg-[#FB923C]" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition ${
                            addVitrinaMode ? "translate-x-[1.35rem]" : "translate-x-0.5"
                          }`}
                        />
                        <span className="sr-only">{addVitrinaMode ? "Vitrina mode on" : "Vitrina mode off"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:col-span-2 md:grid-cols-2">
                    <div>
                      <ProductFormField
                        label={addVitrinaMode ? "Vitrina price (DA)" : "Standard price (DA)"}
                        hint={
                          addVitrinaMode
                            ? "Customer-facing Vitrina price. Standard (strikethrough) will be 20% higher."
                            : "Single list price everywhere on the shop."
                        }
                      >
                        <input
                          name="price"
                          type="number"
                          min={addVitrinaMode ? 1 : 0}
                          step="1"
                          required
                          value={addPriceInput}
                          onChange={(e) => setAddPriceInput(e.target.value)}
                          className={pf.input}
                        />
                      </ProductFormField>
                      {addVitrinaMode && addVitrinaStandardPreview != null ? (
                        <div className="mt-2 rounded-lg border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 text-sm text-stone-800">
                          <span className="text-dark-4">Standard reference price (+20%): </span>
                          <span className="font-semibold tabular-nums">{addVitrinaStandardPreview} DA</span>
                          <span className="text-dark-4"> (stored for strikethrough display)</span>
                        </div>
                      ) : null}
                    </div>
                    <ProductFormField label="Stock quantity" hint="Units available to sell.">
                      <input name="instock" type="number" min="0" required className={pf.input} />
                    </ProductFormField>
                  </div>
                </div>
              </ProductFormSection>

              <ProductFormSection
                id={productFormSectionIds.content}
                title="Description & care"
                description="Main copy for the product page. Care instructions help reduce returns."
                badge="Required text"
              >
                <div className="space-y-5">
                  <ProductFormField label="Product overview" hint="Benefits, what’s included, who it’s for.">
                    <textarea
                      name="description"
                      required
                      rows={5}
                      className={pf.textarea}
                    />
                  </ProductFormField>
                  <ProductFormField
                    label="Care & maintenance"
                    hint="Optional. Washing, storage, battery tips, etc."
                  >
                    <textarea
                      name="careMaintenance"
                      rows={3}
                      className={pf.textarea}
                    />
                  </ProductFormField>
                </div>
              </ProductFormSection>

              <ProductFormSection
                id={productFormSectionIds.colors}
                title="Colors & catalog image"
                description="Required. Each color needs a photo. Choose which color is the default — its image appears in shop listings."
                badge="Required"
              >
                <AdminColorVariantsPanel
                  colorRows={colorRows}
                  setColorRows={setColorRows}
                  defaultColorName={defaultColorName}
                  setDefaultColorName={setDefaultColorName}
                  colorHasPriceOverride={colorHasPriceOverride}
                  setColorHasPriceOverride={setColorHasPriceOverride}
                />
              </ProductFormSection>

              <ProductFormSection
                id={productFormSectionIds.sizes}
                title="Sizes"
                description="Optional. Enable when this product is sold in multiple sizes. You can set a different price per size."
              >
                <AdminProductSizesPanel
                  sizesEnabled={sizesEnabled}
                  setSizesEnabled={setSizesEnabled}
                  sizeHasPriceOverride={sizeHasPriceOverride}
                  setSizeHasPriceOverride={setSizeHasPriceOverride}
                  sizeRows={sizeRows}
                  setSizeRows={setSizeRows}
                />
              </ProductFormSection>

              <ProductFormSection
                id={productFormSectionIds.variants}
                title="Specifications & extra fields"
                description="Optional. Specs for storage, RAM, etc. Additional info shows as label/value rows on the product page."
              >
                <div className="space-y-6">
                  <div className={pf.cardMuted}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-800">Specifications</p>
                        <p className="text-xs text-dark-4">Each spec has a name (e.g. Storage) and one or more options.</p>
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
                              className="h-4 w-4 rounded border-stone-300 text-orange outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
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
                        <p className="text-xs text-dark-4">Extra label/value pairs (warranty, SKU, material…).</p>
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
            </ProductFormShell>

            {createState.error ? <p className={`mt-4 ${pf.alertError}`}>{createState.error}</p> : null}
            {createState.success ? <p className={`mt-4 ${pf.alertSuccess}`}>{createState.message}</p> : null}
          </form>
          </section>
        )}

        {renderTab(
          "products",
          <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Products" value={productStats.total} />
            <StatCard label="Total Stock" value={productStats.totalStock} />
            <StatCard label="Low Stock (<=5)" value={productStats.lowStock} />
            <StatCard label="Average Price (DZD)" value={productStats.averagePrice} />
          </div>

          <div className="mt-6 rounded-lg border border-gray-3 bg-white p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-medium text-dark">Products by category</h2>
                <p className="mt-1 text-sm text-dark-4">
                  Switch tabs to list products in each category. Use Edit to change details, price, stock, and colors.
                </p>
              </div>
              <input
                type="search"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Search title, brand, slug"
                className="w-full rounded-md border border-gray-3 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-stone-500 focus:border-[#FB923C] focus:outline-none focus-visible:outline-none focus-visible:ring-0 lg:w-[300px]"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-b border-gray-3 pb-3">
              <button
                type="button"
                onClick={() => setProductCategoryTab("__all__")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium outline-none transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                    productCategoryTab === "__all__"
                    ? "bg-orange text-white"
                    : "border border-gray-3 text-dark hover:border-[#FB923C]"
                }`}
              >
                All ({products.length})
              </button>
              {productCategoryNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setProductCategoryTab(name)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium outline-none transition focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${
                    productCategoryTab === name
                      ? "bg-orange text-white"
                      : "border border-gray-3 text-dark hover:border-[#FB923C]"
                  }`}
                >
                  {name} ({products.filter((p) => p.categoryName === name).length})
                </button>
              ))}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr className="border-b border-gray-3 text-xs uppercase tracking-wide text-dark-4">
                    <th className="pb-3 font-medium">Image</th>
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium">Rating</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm text-dark-4">
                        {products.length === 0 ?
                          "No products loaded. Check the database connection in .env — when it works, opening this page syncs every storefront item from the catalogue into Postgres."
                        : productQuery.trim() ?
                          "No products match your search. Clear the search box or try another keyword."
                        : productCategoryTab !== "__all__" ?
                          `No products in “${productCategoryTab}”. Pick another category tab or All.`
                        : "No products match the current filter."}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="border-b border-gray-2 text-sm text-dark transition hover:bg-[#fffaf5] last:border-0">
                        <td className="py-3 pr-4">
                          <img src={p.mainimage} alt={p.title} className="h-10 w-10 rounded-md object-cover" />
                        </td>
                        <td className="py-3 pr-4">{p.title}</td>
                        <td className="py-3 pr-4">{p.categoryName}</td>
                        <td className="py-3 pr-4">
                          {p.jomlaPrice != null ? (
                            <span className="tabular-nums">
                              <span className="font-medium text-[#ea580c]">{p.jomlaPrice}</span>
                              <span className="text-dark-4"> / </span>
                              <span className="text-dark-4 line-through">{p.price}</span>
                              <span className="ml-1 text-xs text-dark-4">Vitrina</span>
                            </span>
                          ) : (
                            <span className="tabular-nums">{p.price}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">{p.instock}</td>
                        <td className="py-3 pr-4">{p.rating}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap items-start gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingProduct(p)}
                              className="rounded-md border border-gray-3 px-3 py-1 text-xs font-medium text-dark hover:border-orange hover:text-orange-dark"
                            >
                              Edit
                            </button>
                            <AdminDeleteProductButton
                              productId={p.id}
                              productTitle={p.title}
                              onDeleted={() => {
                                if (editingProduct?.id === p.id) setEditingProduct(null);
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {editingProduct ? (
            <EditProductModal
              key={editingProduct.id}
              product={editingProduct}
              onClose={() => setEditingProduct(null)}
            />
          ) : null}
          </section>
        )}

        {renderTab(
          "tracking",
          <section className="mt-2">
            <ProductAnalyticsTrackingPanel />
          </section>
        )}

        {renderTab(
          "role-emails",
          <section className="mt-2">
            <RecommendationRoleEmailsPanel />
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-3 bg-white p-5 shadow-1">
      <p className="text-custom-sm text-dark-4">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-dark">{value}</p>
    </div>
  );
}
