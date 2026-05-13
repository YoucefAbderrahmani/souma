"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import {
  APPLIED_ACTION_KIND_META,
  type AppliedActionDto,
} from "@/types/seller-helper-timeline";
import { cn } from "@/lib/utils";

type AppliedActionDetailsModalProps = {
  action: AppliedActionDto | null;
  onClose: () => void;
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) {
    return new Intl.RelativeTimeFormat("en-US", { numeric: "auto" }).format(-minutes, "minute");
  }
  const hours = Math.round(diffMs / 3_600_000);
  if (Math.abs(hours) < 48) {
    return new Intl.RelativeTimeFormat("en-US", { numeric: "auto" }).format(-hours, "hour");
  }
  const days = Math.round(diffMs / 86_400_000);
  return new Intl.RelativeTimeFormat("en-US", { numeric: "auto" }).format(-days, "day");
}

function prettyKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-dark-4">—</span>;
  }
  if (typeof value === "string") {
    if (value.length === 0) return <span className="text-dark-4">—</span>;
    return <span className="break-words text-dark">{value}</span>;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return <span className="tabular-nums text-dark">{value.toString()}</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
          value ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        )}
      >
        {value ? "Yes" : "No"}
      </span>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-dark-4">(empty)</span>;
    return (
      <ul className="list-disc space-y-1 pl-5 text-dark-3">
        {value.map((entry, index) => (
          <li key={`arr-${depth}-${index}`}>{renderValue(entry, depth + 1)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-dark-4">(empty)</span>;
    return (
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-xs">
        {entries.map(([k, v]) => (
          <div key={`obj-${depth}-${k}`} className="contents">
            <dt className="font-medium text-dark-4">{prettyKey(k)}</dt>
            <dd className="min-w-0 text-dark-3">{renderValue(v, depth + 1)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span className="text-dark-3">{String(value)}</span>;
}

export function AppliedActionDetailsModal({ action, onClose }: AppliedActionDetailsModalProps) {
  useEffect(() => {
    if (!action) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
    };
  }, [action, onClose]);

  const meta = useMemo(() => (action ? APPLIED_ACTION_KIND_META[action.kind] : null), [action]);

  if (!action || !meta) return null;

  const details = action.details ?? {};
  const detailEntries = Object.entries(details);

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="applied-action-details-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-3 bg-white shadow-2xl"
      >
        <div
          className="flex items-start gap-3 border-b border-gray-3 px-5 py-4"
          style={{ backgroundColor: `${meta.color}10` }}
        >
          <span
            className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: meta.color }}
          >
            {meta.label[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: meta.color }}
            >
              {meta.label}
            </p>
            <h3
              id="applied-action-details-title"
              className="mt-0.5 break-words text-base font-semibold text-dark"
            >
              {action.title}
            </h3>
            <p className="mt-1 text-xs text-dark-4">{meta.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-dark-4 hover:bg-white hover:text-dark"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-3 bg-gray-1 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-dark-4">
                Exact time
              </p>
              <p className="mt-1 text-sm font-semibold text-dark">
                {formatTimestamp(action.occurredAt)}
              </p>
              <p className="mt-0.5 text-xs text-dark-4">{formatRelativeTime(action.occurredAt)}</p>
            </div>
            <div className="rounded-lg border border-gray-3 bg-gray-1 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-dark-4">
                Scope
              </p>
              <p className="mt-1 text-sm font-semibold text-dark">
                {action.productTitle ?? "Store-wide"}
              </p>
              {action.productId ? (
                <p className="mt-0.5 text-xs text-dark-4">Product ID #{action.productId}</p>
              ) : null}
            </div>
          </div>

          {action.summary ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-dark-4">
                Summary
              </p>
              <p className="mt-1 break-words text-sm text-dark">{action.summary}</p>
            </div>
          ) : null}

          {detailEntries.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-dark-4">
                Recommendation context
              </p>
              <div className="mt-2 rounded-lg border border-gray-3 bg-white p-3">
                {renderValue(details)}
              </div>
            </div>
          ) : null}

          {action.sourceRefId ? (
            <p className="text-[11px] text-dark-4">
              <span className="font-semibold uppercase tracking-wide">Source ref:</span>{" "}
              <code className="rounded bg-gray-1 px-1.5 py-0.5 font-mono text-[11px] text-dark-3">
                {action.sourceRefId}
              </code>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
