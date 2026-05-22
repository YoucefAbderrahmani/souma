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
        "rounded-lg border border-gray-3 bg-gray-1 px-3 py-3 sm:px-4",
        disabled && "pointer-events-none opacity-60",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-dark">Fixes per product</p>
          <p className="mt-0.5 text-[11px] text-dark-4">
            How many merchandising tips and quick fixes each Vitrina card shows (1–6).
          </p>
        </div>
        <span
          className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-orange/25 bg-white px-2 py-1 text-sm font-bold tabular-nums text-orange-dark"
          aria-live="polite"
        >
          {clamped}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wide text-dark-4">{MIN_VITRINA_FIXES_PER_ITEM}</span>
        <input
          type="range"
          min={MIN_VITRINA_FIXES_PER_ITEM}
          max={MAX_VITRINA_FIXES_PER_ITEM}
          step={1}
          value={clamped}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 min-w-0 flex-1 cursor-pointer accent-orange"
          aria-label="Fixes per Vitrina product"
          aria-valuemin={MIN_VITRINA_FIXES_PER_ITEM}
          aria-valuemax={MAX_VITRINA_FIXES_PER_ITEM}
          aria-valuenow={clamped}
        />
        <span className="text-[10px] font-bold uppercase tracking-wide text-dark-4">{MAX_VITRINA_FIXES_PER_ITEM}</span>
      </div>
    </div>
  );
}
