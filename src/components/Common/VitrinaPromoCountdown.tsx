"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPromoCountdownRemaining } from "@/lib/product-promo-countdown-format";
import { cn } from "@/lib/utils";

export type VitrinaCountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  showDays: boolean;
};

export function getVitrinaCountdownParts(remainingMs: number): VitrinaCountdownParts {
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return {
    days,
    hours,
    minutes,
    seconds,
    showDays: days > 0,
  };
}

function CountdownUnit({
  value,
  label,
  compact,
}: {
  value: number;
  label: string;
  compact?: boolean;
}) {
  const display = String(value).padStart(2, "0");
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span
        className={cn(
          "inline-flex min-w-[2ch] items-center justify-center rounded-md font-bold tabular-nums leading-none",
          compact ?
            "bg-white/95 px-1 py-0.5 text-[11px] text-dark shadow-sm sm:text-xs"
          : "bg-white px-1.5 py-1 text-sm text-dark shadow-sm sm:px-2 sm:py-1.5 sm:text-base"
        )}
      >
        {display}
      </span>
      <span
        className={cn(
          "font-medium uppercase tracking-wider text-dark-4",
          compact ? "text-[8px] leading-none sm:text-[9px]" : "text-[9px] sm:text-[10px]"
        )}
      >
        {label}
      </span>
    </span>
  );
}

function CountdownSeparator({ compact }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        "self-start font-bold tabular-nums text-orange",
        compact ? "mt-0.5 text-sm sm:text-base" : "mt-1 text-lg sm:text-xl"
      )}
      aria-hidden
    >
      :
    </span>
  );
}

function SegmentedCountdown({
  parts,
  compact,
}: {
  parts: VitrinaCountdownParts;
  compact?: boolean;
}) {
  if (parts.showDays) {
    return (
      <span className="inline-flex items-start gap-1 sm:gap-1.5">
        <CountdownUnit value={parts.days} label="Days" compact={compact} />
        <CountdownSeparator compact={compact} />
        <CountdownUnit value={parts.hours} label="Hrs" compact={compact} />
        <CountdownSeparator compact={compact} />
        <CountdownUnit value={parts.minutes} label="Min" compact={compact} />
        <CountdownSeparator compact={compact} />
        <CountdownUnit value={parts.seconds} label="Sec" compact={compact} />
      </span>
    );
  }

  return (
    <span className="inline-flex items-start gap-1 sm:gap-1.5">
      <CountdownUnit value={parts.hours} label="Hrs" compact={compact} />
      <CountdownSeparator compact={compact} />
      <CountdownUnit value={parts.minutes} label="Min" compact={compact} />
      <CountdownSeparator compact={compact} />
      <CountdownUnit value={parts.seconds} label="Sec" compact={compact} />
    </span>
  );
}

export function VitrinaPromoCountdown({
  remainingMs,
  prefix = "Ends in",
  variant = "inline",
  className,
}: {
  remainingMs: number;
  prefix?: string;
  variant?: "inline" | "pill" | "banner" | "card";
  className?: string;
}) {
  if (remainingMs <= 0) return null;

  const parts = getVitrinaCountdownParts(remainingMs);
  const compact = variant === "pill" || variant === "inline";

  if (variant === "card") {
    const label = formatPromoCountdownRemaining(remainingMs);
    return (
      <span
        className={cn(
          "inline-flex w-full max-w-full items-center gap-2 rounded-md border border-orange/30 bg-orange/[0.92] px-2 py-1.5 text-left shadow-md backdrop-blur-[2px] sm:px-2.5",
          className
        )}
        role="timer"
        aria-live="polite"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 6V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex flex-col leading-tight">
          <span className="text-[8px] font-semibold uppercase tracking-wide text-white/90 sm:text-[9px]">
            {prefix.trim() || "Ends in"}
          </span>
          <span className="text-[11px] font-bold tabular-nums text-white sm:text-xs">{label}</span>
        </span>
      </span>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-orange/25 bg-gradient-to-r from-orange/[0.12] via-orange/[0.06] to-transparent px-3.5 py-2.5 sm:px-4 sm:py-3",
          className
        )}
        role="timer"
        aria-live="polite"
      >
        <span className="inline-flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange text-white shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 6V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-dark sm:text-xs">
              {prefix.trim() || "Limited offer"}
            </span>
            <span className="text-custom-sm font-medium text-dark">Hurry — price goes up when the timer hits zero</span>
          </span>
        </span>
        <SegmentedCountdown parts={parts} compact />
      </div>
    );
  }

  if (variant === "pill") {
    const label = formatPromoCountdownRemaining(remainingMs);
    return (
      <span
        className={cn(
          "inline-flex max-w-[min(100%,11rem)] flex-col gap-1 rounded-md border border-orange-light-3 bg-orange px-2 py-1.5 text-left shadow-md sm:max-w-[12.5rem] sm:px-2.5 sm:py-2",
          className
        )}
        role="timer"
        aria-live="polite"
      >
        {prefix.trim() ?
          <span className="text-[8px] font-semibold uppercase tracking-wide text-white/90 sm:text-[9px]">
            {prefix.trim()}
          </span>
        : null}
        <span className="text-[10px] font-bold tabular-nums leading-tight text-white sm:text-[11px]">
          {label}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 flex-col gap-1.5 rounded-lg border border-orange/20 bg-orange/[0.08] px-2.5 py-2 sm:px-3 sm:py-2.5",
        className
      )}
      role="timer"
      aria-live="polite"
    >
      {prefix.trim() ?
        <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-dark sm:text-[11px]">
          {prefix.trim()}
        </span>
      : null}
      <SegmentedCountdown parts={parts} compact />
    </span>
  );
}

/** Live countdown from sessionStorage-backed promo end time. */
export function VitrinaPromoCountdownLive({
  endAt,
  prefix = "Ends in",
  variant = "inline",
  className,
}: {
  endAt: number | null;
  prefix?: string;
  variant?: "inline" | "pill" | "banner" | "card";
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endAt]);

  const remainingMs = useMemo(() => {
    if (endAt == null) return null;
    return endAt - now;
  }, [endAt, now]);

  if (remainingMs == null) {
    return (
      <span className={cn("text-xs font-medium text-dark-4", className)} aria-hidden>
        …
      </span>
    );
  }

  return (
    <VitrinaPromoCountdown
      remainingMs={remainingMs}
      prefix={prefix}
      variant={variant}
      className={className}
    />
  );
}
