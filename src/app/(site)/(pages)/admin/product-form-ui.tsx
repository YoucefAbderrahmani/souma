"use client";

import React from "react";

/** Shared Tailwind tokens for add + edit product forms */
export const pf = {
  input:
    "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-dark outline-none transition placeholder:text-stone-400 focus:border-orange focus:outline-none focus-visible:outline-none focus-visible:ring-0",
  select:
    "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-dark outline-none transition focus:border-orange focus:outline-none focus-visible:outline-none focus-visible:ring-0",
  textarea:
    "w-full resize-y rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-dark outline-none transition placeholder:text-stone-400 focus:border-orange focus:outline-none focus-visible:outline-none focus-visible:ring-0",
  label: "mb-1.5 block text-sm font-medium text-stone-800",
  hint: "mt-1 text-xs leading-relaxed text-dark-4",
  btnPrimary:
    "inline-flex items-center justify-center rounded-lg bg-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-orange-dark focus:outline-none focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
  btnSecondary:
    "inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm outline-none transition hover:border-[#FB923C] hover:text-[#ea580c] focus:outline-none focus-visible:outline-none focus-visible:ring-0",
  btnAccent:
    "inline-flex items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50/80 px-3 py-1.5 text-xs font-medium text-stone-700 outline-none transition hover:border-[#FB923C] hover:bg-[#fff7ed] focus:outline-none focus-visible:outline-none focus-visible:ring-0",
  btnDanger:
    "inline-flex shrink-0 items-center justify-center rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 outline-none transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:outline-none focus-visible:ring-0",
  card: "rounded-xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6",
  cardMuted: "rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 sm:p-5",
  innerCard: "rounded-lg border border-stone-200 bg-white p-4 shadow-sm",
  shell: "overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-md shadow-stone-200/40",
  shellHeader:
    "border-b border-stone-100 bg-gradient-to-r from-stone-50 to-[#fff7ed]/40 px-5 py-4 sm:px-6",
  shellBody: "bg-stone-50/30 px-4 py-5 sm:px-6 sm:py-6",
  jumpNavActive: "bg-orange text-white shadow-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
  jumpNavIdle:
    "border border-stone-200 bg-white text-stone-700 outline-none hover:border-[#FB923C]/60 hover:text-[#c2410c] focus:outline-none focus-visible:outline-none focus-visible:ring-0",
} as const;

const sectionIds = {
  basics: "admin-pf-basics",
  content: "admin-pf-content",
  variants: "admin-pf-variants",
  media: "admin-pf-media",
} as const;

export const productFormSectionIds = sectionIds;

type JumpKey = keyof typeof sectionIds;

const JUMP_STEPS: { id: JumpKey; label: string }[] = [
  { id: "basics", label: "Basics & pricing" },
  { id: "content", label: "Description" },
  { id: "variants", label: "Colors & specs" },
  { id: "media", label: "Image" },
];

export function ProductFormJumpNav({ className = "" }: { className?: string }) {
  const scrollTo = (key: JumpKey) => {
    const el = document.getElementById(sectionIds[key]);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      className={`sticky top-0 z-10 -mx-4 border-b border-stone-200/80 bg-white/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 ${className}`}
      aria-label="Form sections"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-dark-4">Jump to</p>
      <div className="flex flex-wrap gap-2">
        {JUMP_STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => scrollTo(step.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${pf.jumpNavIdle}`}
          >
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
    <div className={pf.shell}>
      <div className={pf.shellHeader}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-stone-900 sm:text-xl">{title}</h2>
            {subtitle ? <p className="mt-1 max-w-2xl text-sm text-dark-4">{subtitle}</p> : null}
          </div>
          <span className="shrink-0 rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-medium text-[#c2410c]">
            All sections in one form
          </span>
        </div>
      </div>
      <div className={pf.shellBody}>
        <ProductFormJumpNav />
        <div className="mt-6 space-y-6">{children}</div>
        {footer ? <div className="mt-8 border-t border-stone-200 pt-6">{footer}</div> : null}
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
    <section id={id} className="scroll-mt-28">
      <div className={pf.card}>
        <div className="mb-4 flex flex-wrap items-start gap-3 border-b border-stone-100 pb-4">
          <div
            className="hidden h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-orange to-[#FB923C] sm:block"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-stone-900">{title}</h3>
              {badge ? (
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                  {badge}
                </span>
              ) : null}
            </div>
            {description ? <p className="mt-1 text-sm text-dark-4">{description}</p> : null}
          </div>
        </div>
        {children}
      </div>
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
    <label className={`block ${className}`}>
      <span className={pf.label}>{label}</span>
      {children}
      {hint ? <span className={pf.hint}>{hint}</span> : null}
    </label>
  );
}

export function ProductImageDropZone({
  inputId,
  fileName,
  onFileChange,
  required,
  helper,
}: {
  inputId: string;
  fileName: string;
  onFileChange: (file: File | undefined) => void;
  required?: boolean;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/40 p-5 transition hover:border-[#FB923C]/40 hover:bg-[#fff7ed]/20">
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-stone-100">
          <svg className="h-7 w-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-800">Main product photo</p>
          <p className="mt-0.5 text-xs text-dark-4">
            {helper ?? "JPG, PNG, WebP or GIF. Clear image on a neutral background works best."}
          </p>
          <p className="mt-2 truncate text-xs font-medium text-orange-dark">{fileName}</p>
        </div>
        <label
          htmlFor={inputId}
          className={`${pf.btnPrimary} cursor-pointer sm:shrink-0`}
        >
          Browse files
        </label>
        <input
          id={inputId}
          name="image"
          type="file"
          accept="image/*"
          required={required}
          className="sr-only"
          onChange={(e) => onFileChange(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
