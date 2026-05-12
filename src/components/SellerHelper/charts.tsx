"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
export function ProgressBar({
  value,
  className,
  trackClassName,
}: {
  value: number;
  className?: string;
  trackClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const fillWidth = clamped > 0 ? Math.max(clamped, 4) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-gray-3", trackClassName, className)}
    >
      <div
        className="h-full rounded-full bg-orange transition-[width] duration-700 ease-out"
        style={{ width: `${fillWidth}%` }}
      />
    </div>
  );
}

const TIME_LABELS = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"];

export function TrafficChart({ series }: { series: number[] }) {
  const pts = series.length > 0 ? series : Array.from({ length: 24 }, () => 0);
  const gid = useId().replace(/:/g, "");
  const fillId = `sellerTrafficFill-${gid}`;
  const strokeId = `sellerTrafficStroke-${gid}`;
  const w = 560;
  const h = 200;
  const pad = { top: 12, right: 8, bottom: 28, left: 36 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const n = pts.length;
  const pathPoints = pts.map((y, i) => {
    const x = pad.left + (i / (n - 1)) * innerW;
    const py = pad.top + innerH * (1 - y);
    return { x, y: py };
  });
  const baseY = pad.top + innerH;
  const firstX = pad.left;
  const lastX = pad.left + innerW;
  const lineD = pathPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaD = `${lineD} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  const polyPts = pathPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full max-w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F79A66" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#FBBF24" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#FEECE6" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F9B38B" />
          <stop offset="50%" stopColor="#F27430" />
          <stop offset="100%" stopColor="#E1580E" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={pad.left}
          y1={pad.top + innerH * t}
          x2={w - pad.right}
          y2={pad.top + innerH * t}
          stroke="#E5E7EB"
          strokeWidth="1"
        />
      ))}
      <path d={areaD} fill={`url(#${fillId})`} />
      <polyline
        points={polyPts}
        fill="none"
        stroke={`url(#${strokeId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {TIME_LABELS.map((label, i) => (
        <text
          key={label}
          x={pad.left + (i / (TIME_LABELS.length - 1)) * innerW}
          y={h - 6}
          textAnchor="middle"
          className="fill-dark-4 text-[9px]"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}
