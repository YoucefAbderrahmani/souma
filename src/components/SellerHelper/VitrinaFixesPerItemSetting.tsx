"use client";

import {
  clampVitrinaFixesPerItem,
  MAX_VITRINA_FIXES_PER_ITEM,
  MIN_VITRINA_FIXES_PER_ITEM,
} from "@/lib/vitrina-fixes-per-item";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

export function VitrinaFixesPerItemSetting({ value, onChange, disabled, className }: Props) {
  const clamped = clampVitrinaFixesPerItem(value);

  return (
    <div
      className={cn(
        "rounded-md border border-gray-3 bg-gray-1 px-2.5 py-2",
        disabled && "pointer-events-none opacity-60",
        className
      )}
    >
      <p className="sr-only">
        Fixes per product: how many merchandising tips and quick fixes each Vitrina card shows, from{" "}
        {MIN_VITRINA_FIXES_PER_ITEM} to {MAX_VITRINA_FIXES_PER_ITEM}.
      </p>
      <div className="flex items-center gap-2 sm:gap-2.5">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-dark-4">
          Fixes / item
        </span>
        <span className="text-[9px] font-bold tabular-nums text-dark-4">{MIN_VITRINA_FIXES_PER_ITEM}</span>
        <input
          type="range"
          min={MIN_VITRINA_FIXES_PER_ITEM}
          max={MAX_VITRINA_FIXES_PER_ITEM}
          step={1}
          value={clamped}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-1 min-w-0 flex-1 cursor-pointer accent-orange sm:max-w-[140px]"
          aria-label="Fixes per Vitrina product"
          aria-valuemin={MIN_VITRINA_FIXES_PER_ITEM}
          aria-valuemax={MAX_VITRINA_FIXES_PER_ITEM}
          aria-valuenow={clamped}
        />
        <span className="text-[9px] font-bold tabular-nums text-dark-4">{MAX_VITRINA_FIXES_PER_ITEM}</span>
        <span
          className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded border border-orange/20 bg-white px-1 text-[10px] font-bold tabular-nums text-orange-dark"
          aria-hidden
        >
          {clamped}
        </span>
      </div>
    </div>
  );
}
