"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  sellerGhostButton,
  sellerPanel,
  sellerPanelMuted,
  sellerPlaceholder,
  sellerPrimaryButton,
  sellerSecondaryButton,
} from "@/components/SellerHelper/layout";

/** Admin product forms — aligned with Seller Helper (gray-3 borders, orange accent). */
export const adminPf = {
  input:
    "w-full rounded-lg border border-gray-3 bg-white px-3.5 py-2.5 text-custom-sm text-dark outline-none transition placeholder:text-dark-4 focus:border-orange focus:outline-none focus-visible:ring-0",
  select:
    "w-full rounded-lg border border-gray-3 bg-white px-3.5 py-2.5 text-custom-sm text-dark outline-none transition focus:border-orange focus:outline-none focus-visible:ring-0",
  textarea:
    "w-full resize-y rounded-lg border border-gray-3 bg-white px-3.5 py-2.5 text-custom-sm text-dark outline-none transition placeholder:text-dark-4 focus:border-orange focus:outline-none focus-visible:ring-0",
  label: "mb-1.5 block text-custom-sm font-medium text-dark",
  hint: "mt-1 text-xs leading-relaxed text-dark-4",
  btnPrimary: cn(sellerPrimaryButton, "px-5 py-2.5 text-custom-sm"),
  btnSecondary: cn(sellerSecondaryButton, "px-4 py-2.5 text-custom-sm"),
  btnAccent:
    "inline-flex items-center justify-center rounded-md border border-dashed border-gray-3 bg-gray-1 px-3 py-1.5 text-xs font-medium text-dark-3 transition hover:border-orange hover:bg-orange/10 hover:text-orange-dark",
  btnDanger:
    "inline-flex shrink-0 items-center justify-center rounded-md border border-gray-3 bg-white px-3 py-2 text-xs font-medium text-dark-4 transition hover:border-red hover:bg-red-light-6 hover:text-red-dark",
  panel: cn(sellerPanel, "p-4 sm:p-5"),
  panelMuted: cn(sellerPanelMuted, "space-y-4"),
  cardMuted: cn(sellerPanelMuted, "space-y-4"),
  innerCard: "rounded-lg border border-gray-3 bg-white p-4 shadow-sm",
  shell: cn(sellerPanel, "overflow-hidden shadow-1"),
  shellHeader: "border-b border-gray-3 bg-gray-1 px-5 py-4 sm:px-6",
  shellBody: "bg-gray-2/40 px-4 py-5 sm:px-6 sm:py-6",
  jumpNav:
    "sticky top-2 z-10 -mx-4 mb-6 border-b border-gray-3 bg-white/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6",
  jumpBtn:
    "rounded-full border border-gray-3 bg-white px-3 py-1.5 text-xs font-medium text-dark-3 transition hover:border-orange hover:text-orange",
  alertError: "rounded-lg border border-red-light-3 bg-red-light-6 px-4 py-3 text-custom-sm text-red-dark",
  alertSuccess: "rounded-lg border border-teal/25 bg-teal/10 px-4 py-3 text-custom-sm text-teal-dark",
} as const;

const sectionIds = {
  basics: "admin-pf-basics",
  content: "admin-pf-content",
  colors: "admin-pf-colors",
  sizes: "admin-pf-sizes",
  variants: "admin-pf-variants",
} as const;

export const productFormSectionIds = sectionIds;

type JumpKey = keyof typeof sectionIds;

const JUMP_STEPS: { id: JumpKey; label: string }[] = [
  { id: "basics", label: "Basics & pricing" },
  { id: "content", label: "Description" },
  { id: "colors", label: "Colors & image" },
  { id: "sizes", label: "Sizes" },
  { id: "variants", label: "Specs & extras" },
];

export function ProductFormJumpNav({ className = "" }: { className?: string }) {
  const scrollTo = (key: JumpKey) => {
    document.getElementById(sectionIds[key])?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className={cn(adminPf.jumpNav, className)} aria-label="Form sections">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-dark-4">Jump to</p>
      <div className="flex flex-wrap gap-2">
        {JUMP_STEPS.map((step) => (
          <button key={step.id} type="button" onClick={() => scrollTo(step.id)} className={adminPf.jumpBtn}>
            {step.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function ProductFormShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className={adminPf.shell}>
      <div className={adminPf.shellHeader}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-dark sm:text-xl">{title}</h2>
            {subtitle ? <p className="mt-1 max-w-2xl text-custom-sm text-dark-4">{subtitle}</p> : null}
          </div>
          <span className="shrink-0 rounded-md border border-orange/25 bg-orange/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-orange-dark">
            Admin
          </span>
        </div>
      </div>
      <div className={adminPf.shellBody}>
        <ProductFormJumpNav />
        <div className="space-y-6">{children}</div>
        {footer ? <div className="mt-8 border-t border-gray-3 pt-6">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ProductFormSection({
  id,
  title,
  description,
  badge,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={adminPf.panel}>
      <div className="mb-4 flex flex-wrap items-start gap-3 border-b border-gray-3 pb-4">
        <div
          className="hidden h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-orange to-[#FB923C] sm:block"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-dark">{title}</h3>
            {badge ?
              <span className="rounded-md border border-gray-3 bg-gray-1 px-2 py-0.5 text-xs font-medium text-dark-4">
                {badge}
              </span>
            : null}
          </div>
          {description ? <p className="mt-1 text-custom-sm text-dark-4">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ProductFormField({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className={adminPf.label}>{label}</span>
      {children}
      {hint ? <span className={adminPf.hint}>{hint}</span> : null}
    </label>
  );
}

/** @deprecated Main image upload removed — use color variant photos instead. */
export function ProductImageDropZone() {
  return <div className={sellerPlaceholder}>Use color photos in the Colors section.</div>;
}

/** Re-export for components that import `pf` */
export const pf = adminPf;
