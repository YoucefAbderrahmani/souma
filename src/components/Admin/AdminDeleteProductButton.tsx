"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProductAction } from "@/app/(site)/(pages)/(admin-shell)/admin/actions";
import { adminPf } from "@/app/(site)/(pages)/(admin-shell)/admin/product-form-ui";
import { cn } from "@/lib/utils";

const CONFIRM_MS = 4000;

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
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disarm = useCallback(() => {
    setArmed(false);
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => disarm(), [disarm]);

  const runDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteProductAction(productId);
      if (result.error) {
        setError(result.error);
        disarm();
        return;
      }
      disarm();
      onDeleted?.();
      router.refresh();
    });
  };

  const handleClick = () => {
    if (pending) return;
    if (!armed) {
      setArmed(true);
      setError(null);
      armTimerRef.current = setTimeout(disarm, CONFIRM_MS);
      return;
    }
    runDelete();
  };

  const label =
    pending ? "Deleting…"
    : armed ? "Click again to delete"
    : "Delete";

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title={
          armed ?
            `Remove “${productTitle}” from the store permanently`
          : `Delete “${productTitle}” from the store`
        }
        className={cn(
          adminPf.btnDanger,
          armed && !pending && "border-red bg-red-light-6 text-red-dark",
          pending && "opacity-60"
        )}
      >
        {label}
      </button>
      {error ? <span className="max-w-[220px] text-[11px] text-red-dark">{error}</span> : null}
    </div>
  );
}
