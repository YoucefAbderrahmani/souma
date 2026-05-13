import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

export function productAvailableQuantity(product: Pick<Product, "instock">): number | null {
  if (typeof product.instock !== "number" || !Number.isFinite(product.instock)) {
    return null;
  }
  return Math.max(0, Math.trunc(product.instock));
}

export function formatProductAvailableQuantity(quantity: number): string {
  if (quantity <= 0) return "Out of stock";
  return `${quantity} in stock`;
}

export function ProductAvailableQuantity({
  product,
  className,
  variant = "default",
}: {
  product: Pick<Product, "instock">;
  className?: string;
  /** `compact` = smaller type for the line under list/PDP prices */
  variant?: "default" | "compact";
}) {
  const available = productAvailableQuantity(product);
  if (available === null) return null;

  return (
    <span
      className={cn(
        variant === "compact" ?
          "text-xs font-medium leading-snug sm:text-sm"
        : "text-custom-sm font-medium",
        available === 0 ? "text-[#FB923C]" : "text-green",
        className
      )}
    >
      {formatProductAvailableQuantity(available)}
    </span>
  );
}
