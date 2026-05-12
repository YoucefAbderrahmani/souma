"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  applyVitrinaQuickFixesAction,
  type ApplyVitrinaQuickFixesState,
} from "@/app/(site)/(pages)/admin/actions";
import type { VitrinaProductMarketingRecommendation } from "@/types/vitrina-product-recommendations";
import { sellerGhostButton, sellerPrimaryButton, sellerSecondaryButton } from "./layout";

const initialState: ApplyVitrinaQuickFixesState = {};

type Props = {
  product: VitrinaProductMarketingRecommendation;
  onClose: () => void;
};

export default function VitrinaQuickFixConfirmModal({ product, onClose }: Props) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(applyVitrinaQuickFixesAction, initialState);
  const fixes = product.quickFixes ?? [];

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    onClose();
  }, [onClose, router, state.success]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/55 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vitrina-quick-fix-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-gray-3 bg-white p-5 shadow-1 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-dark-4">Apply quick fixes</p>
            <h2 id="vitrina-quick-fix-title" className="mt-0.5 text-lg font-semibold text-dark">
              {product.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={sellerGhostButton} aria-label="Close">
            Close
          </button>
        </div>

        <p className="mt-3 text-custom-sm text-dark-4">
          Review the changes below. Nothing is saved until you confirm.
        </p>

        {fixes.length === 0 ?
          <p className="mt-4 rounded-lg border border-dashed border-gray-4 bg-gray-1 px-4 py-3 text-custom-sm text-dark-4">
            No quick fixes are available for this product right now.
          </p>
        : <ul className="mt-4 space-y-2">
            {fixes.map((fix) => (
              <li key={fix.id} className="rounded-lg border border-gray-3 bg-gray-1 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-dark">{fix.label}</p>
                <p className="mt-1 text-custom-sm text-dark-3">{fix.summary}</p>
              </li>
            ))}
          </ul>
        }

        {state.error ?
          <p className="mt-4 rounded-lg border border-red-light-3 bg-red-light-6 px-3 py-2 text-custom-sm text-red-dark">
            {state.error}
          </p>
        : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={sellerSecondaryButton} disabled={isPending}>
            Cancel
          </button>
          <form action={action}>
            <input type="hidden" name="productId" value={product.productId} />
            <input type="hidden" name="fixes" value={JSON.stringify(fixes)} />
            <input
              type="hidden"
              name="fixIds"
              value={JSON.stringify(fixes.map((fix) => fix.id))}
            />
            <button type="submit" className={sellerPrimaryButton} disabled={isPending || fixes.length === 0}>
              {isPending ? "Applying…" : "Apply quick fixes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
