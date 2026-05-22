"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProductAction } from "@/app/(site)/(pages)/(admin-shell)/admin/actions";
import { adminPf } from "@/app/(site)/(pages)/(admin-shell)/admin/product-form-ui";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  productTitle: string;
  onDeleted?: () => void;
  className?: string;
};

export default function AdminDeleteProductButton({
  productId,
  productTitle,
  onDeleted,
  className,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (pending) return;
    const ok = window.confirm(
      `Permanently delete “${productTitle}”?\n\nThis removes the product from the database (images, reviews, analytics, wishlists, order lines) and from the shop. This cannot be undone.`
    );
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteProductAction(productId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted?.();
      router.refresh();
    });
  };

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title={`Delete “${productTitle}” from the store`}
        className={cn(adminPf.btnDanger, pending && "opacity-60")}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error ? <span className="max-w-[220px] text-[11px] text-red-dark">{error}</span> : null}
    </div>
  );
}
