import { cn } from "@/lib/utils";

export type SellerHelperLogoProps = {
  size?: number;
  className?: string;
  /** Accessible label; omit for decorative use. */
  title?: string;
  /** Orange tile (default) or single-color mark using `currentColor`. */
  variant?: "brand" | "mono";
};

/**
 * Seller Helper brand mark — storefront + rising metrics on Vitrina orange.
 */
export function SellerHelperLogo({
  size = 24,
  className,
  title,
  variant = "brand",
}: SellerHelperLogoProps) {
  const a11y = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };

  if (variant === "mono") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0 text-[#FB923C]", className)}
        {...a11y}
      >
        <path
          d="M6 14.2L16 8.5l10 5.7V22H6V14.2z"
          fill="currentColor"
          fillOpacity={0.15}
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 18.5h2.8v3.5H9.5V18.5zm4.2-2.2h2.8v5.7h-2.8v-5.7zm4.2-3.5h2.8v9.2h-2.8V13z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      {...a11y}
    >
      <rect width="32" height="32" rx="8" fill="#FB923C" />
      <path d="M6 14.2L16 8.5l10 5.7V22H6V14.2z" fill="white" />
      <path
        d="M9.5 18.5h2.8v3.5H9.5V18.5zm4.2-2.2h2.8v5.7h-2.8v-5.7zm4.2-3.5h2.8v9.2h-2.8V13z"
        fill="#FB923C"
      />
    </svg>
  );
}
