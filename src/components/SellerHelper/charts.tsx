"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  APPLIED_ACTION_KIND_META,
  type AppliedActionDto,
  type TimelineSeriesDto,
} from "@/types/seller-helper-timeline";
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

const THREAT_TIME_LABELS = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"];

export function ThreatActivityChart({ series }: { series: number[] }) {
  const pts = series.length > 0 ? series : Array.from({ length: 24 }, () => 0);
  const maxValue = Math.max(...pts, 1);
  const yLabels = [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(maxValue * ratio));
  const gid = useId().replace(/:/g, "");
  const fillId = `sellerThreatFill-${gid}`;
  const strokeId = `sellerThreatStroke-${gid}`;
  const w = 560;
  const h = 200;
  const pad = { top: 12, right: 8, bottom: 28, left: 40 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const n = pts.length;
  const pathPoints = pts.map((value, index) => {
    const x = pad.left + (index / (n - 1)) * innerW;
    const y = pad.top + innerH * (1 - value / maxValue);
    return { x, y };
  });
  const baseY = pad.top + innerH;
  const firstX = pad.left;
  const lastX = pad.left + innerW;
  const lineD = pathPoints.map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`)).join(" ");
  const areaD = `${lineD} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  const polyPts = pathPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full max-w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F27430" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#FBBF24" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#FEECE6" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F9B38B" />
          <stop offset="50%" stopColor="#F27430" />
          <stop offset="100%" stopColor="#E1580E" />
        </linearGradient>
      </defs>
      {yLabels.map((label) => {
        const t = label / maxValue;
        return (
          <g key={label}>
            <line
              x1={pad.left}
              y1={pad.top + innerH * (1 - t)}
              x2={w - pad.right}
              y2={pad.top + innerH * (1 - t)}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
            <text
              x={pad.left - 6}
              y={pad.top + innerH * (1 - t) + 3}
              textAnchor="end"
              className="fill-dark-4 text-[9px]"
            >
              {label}
            </text>
          </g>
        );
      })}
      <path d={areaD} fill={`url(#${fillId})`} />
      <polyline
        points={polyPts}
        fill="none"
        stroke={`url(#${strokeId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {THREAT_TIME_LABELS.map((label, index) => (
        <text
          key={label}
          x={pad.left + (index / (THREAT_TIME_LABELS.length - 1)) * innerW}
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

type TimelineChartProps = {
  buckets: string[];
  series: TimelineSeriesDto[];
  granularity: "hour" | "day";
  appliedActions?: AppliedActionDto[];
  onAppliedActionClick?: (action: AppliedActionDto) => void;
};

function formatTimelineValue(value: number, unit: TimelineSeriesDto["unit"]) {
  if (!Number.isFinite(value)) return "0";
  if (unit === "percent") {
    return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
  }
  if (Math.abs(value) >= 10_000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  if (Math.abs(value) >= 1) {
    return new Intl.NumberFormat("en-US").format(Math.round(value));
  }
  return value.toFixed(2);
}

function formatTimelineBucket(iso: string, granularity: "hour" | "day", index: number, total: number) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (granularity === "hour") {
    return `${String(date.getHours()).padStart(2, "0")}:00`;
  }
  const ratio = total > 1 ? index / (total - 1) : 0;
  const isAnchor = index === 0 || index === total - 1 || ratio === 0.5;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(isAnchor && total > 14 ? { year: "2-digit" } : {}),
  }).format(date);
}

function formatTimelineTooltipLabel(iso: string, granularity: "hour" | "day") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  if (granularity === "hour") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function checkpointGlyph(kind: AppliedActionDto["kind"]): string {
  switch (kind) {
    case "vitrina_quick_fix":
      return "V";
    case "security_block":
      return "B";
    case "security_unblock":
      return "U";
    case "alert_resolved":
      return "A";
    case "ai_recommendation":
      return "R";
    default:
      return "•";
  }
}

function formatCheckpointTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type ChartPoint = { x: number; y: number };

function toChartPoints(
  values: number[],
  scaleY: (value: number) => number,
  scaleX: (index: number) => number
): ChartPoint[] {
  return values.map((value, index) => ({
    x: scaleX(index),
    y: scaleY(value),
  }));
}

/** Smooth cubic Bézier path (Catmull–Rom style) for softer timeline curves. */
function buildSmoothLinePath(points: ChartPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function buildSmoothAreaPath(points: ChartPoint[], baseY: number): string {
  const line = buildSmoothLinePath(points);
  if (!line || points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x.toFixed(2)} ${baseY.toFixed(2)} L ${first.x.toFixed(2)} ${baseY.toFixed(2)} Z`;
}

/** Map screen pointer to SVG viewBox coords (accounts for preserveAspectRatio letterboxing). */
function clientPointToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const svgPoint = point.matrixTransform(matrix.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
}

/** Map a viewBox point to pixels from the left of the chart container. */
function svgPointToContainerLeft(
  svg: SVGSVGElement,
  container: HTMLElement,
  svgX: number,
  svgY: number
) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x = svgX;
  point.y = svgY;
  const screen = point.matrixTransform(matrix);
  const rect = container.getBoundingClientRect();
  return screen.x - rect.left;
}

export function TimelineChart({
  buckets,
  series,
  granularity,
  appliedActions,
  onAppliedActionClick,
}: TimelineChartProps) {
  const chartId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverCheckpointId, setHoverCheckpointId] = useState<string | null>(null);
  const [tooltipLeftPx, setTooltipLeftPx] = useState<number | null>(null);
  const [checkpointTooltipLeftPx, setCheckpointTooltipLeftPx] = useState<number | null>(null);
  const w = 720;
  const h = 340;
  const pad = { top: 28, right: 28, bottom: 58, left: 58 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const visibleSeries = series.filter((entry) => entry.values.some((value) => value !== 0));
  const renderSeries = visibleSeries.length > 0 ? visibleSeries : series;

  const { countSeries, percentSeries, countMax, percentMax } = useMemo(() => {
    const countSeries = renderSeries.filter((entry) => entry.unit === "count");
    const percentSeries = renderSeries.filter((entry) => entry.unit === "percent");
    const collect = (entries: TimelineSeriesDto[]) =>
      entries.flatMap((entry) => entry.values.filter((value) => Number.isFinite(value)));
    const countMax = Math.max(1, ...collect(countSeries));
    const percentMax = Math.max(1, ...collect(percentSeries));
    return { countSeries, percentSeries, countMax, percentMax };
  }, [renderSeries]);

  const totalBuckets = buckets.length;
  const stepMs = granularity === "hour" ? 3_600_000 : 86_400_000;
  const rangeStartMs = (() => {
    const date = new Date(buckets[0] ?? "");
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  })();
  const rangeEndMs = (() => {
    const date = new Date(buckets[buckets.length - 1] ?? "");
    return Number.isNaN(date.getTime()) ? rangeStartMs + stepMs : date.getTime() + stepMs;
  })();
  const rangeSpanMs = Math.max(1, rangeEndMs - rangeStartMs);

  const checkpoints = useMemo(() => {
    if (!appliedActions || appliedActions.length === 0) return [];
    const list = appliedActions
      .map((action) => {
        const t = new Date(action.occurredAt).getTime();
        if (Number.isNaN(t)) return null;
        if (t < rangeStartMs - stepMs || t > rangeEndMs + stepMs) return null;
        const ratio = Math.min(1, Math.max(0, (t - rangeStartMs) / rangeSpanMs));
        const x = pad.left + ratio * innerW;
        const meta = APPLIED_ACTION_KIND_META[action.kind];
        return { action, x, color: meta.color, label: meta.label };
      })
      .filter(
        (entry): entry is { action: AppliedActionDto; x: number; color: string; label: string } =>
          entry != null
      );
    return list.sort((a, b) => a.x - b.x);
  }, [appliedActions, rangeStartMs, rangeEndMs, rangeSpanMs, stepMs, innerW, pad.left]);

  const checkpointPositions = useMemo(() => {
    const out: Array<{
      action: AppliedActionDto;
      x: number;
      color: string;
      label: string;
      yOffset: number;
    }> = [];
    const recent: Array<{ x: number; stack: number }> = [];
    for (const entry of checkpoints) {
      let stack = 0;
      while (recent.some((r) => Math.abs(r.x - entry.x) < 16 && r.stack === stack)) {
        stack += 1;
      }
      recent.push({ x: entry.x, stack });
      if (recent.length > 32) recent.shift();
      out.push({ ...entry, yOffset: stack * 18 });
    }
    return out;
  }, [checkpoints]);

  if (totalBuckets === 0) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-xl border border-dashed border-gray-4 bg-gray-1 text-custom-sm text-dark-4">
        No telemetry yet for this range.
      </div>
    );
  }

  const scaleX = (index: number) => {
    if (totalBuckets === 1) return pad.left + innerW / 2;
    return pad.left + (index / (totalBuckets - 1)) * innerW;
  };
  const baseY = pad.top + innerH;

  const hoveredCheckpoint = hoverCheckpointId
    ? checkpointPositions.find((entry) => entry.action.id === hoverCheckpointId) ?? null
    : null;

  const buildScaleY = (max: number) => (value: number) => {
    if (max <= 0) return baseY;
    const clamped = Math.max(0, value);
    return pad.top + innerH * (1 - clamped / max);
  };
  const scaleCount = buildScaleY(countMax);
  const scalePercent = buildScaleY(percentMax);

  const yGrid = [0, 0.25, 0.5, 0.75, 1];

  const labelStride = Math.max(1, Math.ceil(totalBuckets / 8));

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const container = containerRef.current;
    const coords = clientPointToSvg(svg, event.clientX, event.clientY);
    if (!coords) return;

    const innerOffset = Math.min(innerW, Math.max(0, coords.x - pad.left));
    const idx =
      totalBuckets === 1 ? 0 : Math.round((innerOffset / innerW) * (totalBuckets - 1));
    const clampedIdx = Math.min(totalBuckets - 1, Math.max(0, idx));
    setHoverIndex(clampedIdx);

    if (container) {
      const anchorX = scaleX(clampedIdx);
      const left = svgPointToContainerLeft(svg, container, anchorX, pad.top + innerH / 2);
      setTooltipLeftPx(left);
    }
  };

  const handleLeave = () => {
    setHoverIndex(null);
    setTooltipLeftPx(null);
  };

  const tooltipIndex = hoveredCheckpoint ? null : hoverIndex;
  const tooltipBucket = tooltipIndex != null ? buckets[tooltipIndex] : null;
  const tooltipX = tooltipIndex != null ? scaleX(tooltipIndex) : 0;
  const containerWidth = containerRef.current?.offsetWidth ?? 0;
  const tooltipAlignRight =
    tooltipLeftPx != null && containerWidth > 0 && tooltipLeftPx > containerWidth * 0.68;
  const tooltipShiftX = tooltipAlignRight ? -132 : 12;

  const checkpointTooltipAlignRight =
    checkpointTooltipLeftPx != null &&
    containerWidth > 0 &&
    checkpointTooltipLeftPx > containerWidth * 0.62;
  const checkpointTooltipShiftX = checkpointTooltipAlignRight ? -180 : 12;

  const plotClipId = `timelinePlotClip-${chartId}`;
  const plotBgId = `timelinePlotBg-${chartId}`;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl border border-gray-3 bg-white p-3 shadow-sm sm:p-4"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="h-[18.5rem] w-full max-w-full sm:h-80"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Timeline chart"
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
      >
        <defs>
          <linearGradient id={plotBgId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF8F3" stopOpacity="1" />
            <stop offset="45%" stopColor="#FFFBF7" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </linearGradient>
          <clipPath id={plotClipId}>
            <rect x={pad.left} y={pad.top} width={innerW} height={innerH} rx="8" ry="8" />
          </clipPath>
          {renderSeries.map((entry) => (
            <linearGradient
              key={`area-${entry.metric}`}
              id={`timelineArea-${chartId}-${entry.metric}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={entry.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={entry.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>

        <rect
          x={pad.left}
          y={pad.top}
          width={innerW}
          height={innerH}
          rx="8"
          ry="8"
          fill={`url(#${plotBgId})`}
          stroke="#E8ECF0"
          strokeWidth="1"
        />

        {yGrid.map((t) => {
          const y = pad.top + innerH * t;
          const countLabel = formatTimelineValue(countMax * (1 - t), "count");
          const percentLabel = formatTimelineValue(percentMax * (1 - t), "percent");
          const isBaseline = t === 1;
          return (
            <g key={t}>
              <line
                x1={pad.left}
                y1={y}
                x2={pad.left + innerW}
                y2={y}
                stroke={isBaseline ? "#D1D5DB" : "#ECEFF3"}
                strokeWidth={isBaseline ? 1.25 : 1}
                strokeDasharray={isBaseline ? undefined : "5 7"}
              />
              {countSeries.length > 0 ? (
                <text x={pad.left - 10} y={y + 4} textAnchor="end" className="fill-dark-4 text-[10px] tabular-nums">
                  {countLabel}
                </text>
              ) : null}
              {percentSeries.length > 0 ? (
                <text
                  x={pad.left + innerW + 10}
                  y={y + 4}
                  textAnchor="start"
                  className="fill-dark-4 text-[10px] tabular-nums"
                >
                  {percentLabel}
                </text>
              ) : null}
            </g>
          );
        })}

        {buckets.map((iso, index) => {
          if (index % labelStride !== 0 && index !== totalBuckets - 1) return null;
          return (
            <text
              key={`xlabel-${iso}-${index}`}
              x={scaleX(index)}
              y={baseY + 18}
              textAnchor="middle"
              className="fill-dark-4 text-[10px]"
            >
              {formatTimelineBucket(iso, granularity, index, totalBuckets)}
            </text>
          );
        })}

        {countSeries.length > 0 ? (
          <text x={pad.left - 8} y={pad.top - 8} textAnchor="end" className="fill-dark-4 text-[10px] font-semibold uppercase tracking-wide">
            count
          </text>
        ) : null}
        {percentSeries.length > 0 ? (
          <text
            x={pad.left + innerW + 8}
            y={pad.top - 8}
            textAnchor="start"
            className="fill-dark-4 text-[10px] font-semibold uppercase tracking-wide"
          >
            %
          </text>
        ) : null}

        <g clipPath={`url(#${plotClipId})`}>
          {renderSeries.map((entry) => {
            const scaleY = entry.unit === "percent" ? scalePercent : scaleCount;
            const points = toChartPoints(entry.values, scaleY, scaleX);
            const lineD = buildSmoothLinePath(points);
            const areaD = buildSmoothAreaPath(points, baseY);
            const areaFillId = `timelineArea-${chartId}-${entry.metric}`;
            return (
              <g key={`series-${entry.metric}`}>
                {areaD ?
                  <path d={areaD} fill={`url(#${areaFillId})`} stroke="none" />
                : null}
                <path
                  d={lineD}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </g>

        {renderSeries.flatMap((entry) => {
          const scaleY = entry.unit === "percent" ? scalePercent : scaleCount;
          return entry.values.flatMap((value, index) => {
            if (tooltipIndex !== index) return [];
            return [
              <circle
                key={`pt-${entry.metric}-${index}`}
                cx={scaleX(index)}
                cy={scaleY(value)}
                r={5}
                fill={entry.color}
                stroke="#fff"
                strokeWidth={2}
              />,
            ];
          });
        })}

        {tooltipIndex != null ? (
          <line
            x1={tooltipX}
            y1={pad.top}
            x2={tooltipX}
            y2={baseY}
            stroke="#F27430"
            strokeOpacity="0.35"
            strokeWidth="1.5"
            strokeDasharray="4 5"
          />
        ) : null}

        {checkpointPositions.map((entry) => {
          const isHovered = hoverCheckpointId === entry.action.id;
          const markerY = pad.top - 4 + entry.yOffset;
          return (
            <g
              key={`cp-${entry.action.id}`}
              transform={`translate(${entry.x}, 0)`}
              onPointerEnter={() => {
                setHoverCheckpointId(entry.action.id);
                setHoverIndex(null);
                setTooltipLeftPx(null);
                const svg = svgRef.current;
                const container = containerRef.current;
                if (svg && container) {
                  setCheckpointTooltipLeftPx(
                    svgPointToContainerLeft(svg, container, entry.x, markerY + 7)
                  );
                }
              }}
              onPointerLeave={() => {
                setHoverCheckpointId(null);
                setCheckpointTooltipLeftPx(null);
              }}
              onClick={(event) => {
                event.stopPropagation();
                onAppliedActionClick?.(entry.action);
              }}
              style={{ cursor: onAppliedActionClick ? "pointer" : "default" }}
            >
              <line
                x1={0}
                y1={markerY + 14}
                x2={0}
                y2={baseY}
                stroke={entry.color}
                strokeOpacity={isHovered ? 0.65 : 0.22}
                strokeDasharray="3 3"
                strokeWidth={isHovered ? 1.6 : 1}
                pointerEvents="none"
              />
              <rect
                x={-7}
                y={markerY}
                width={14}
                height={14}
                rx={3}
                ry={3}
                fill={entry.color}
                stroke="#FFFFFF"
                strokeWidth={isHovered ? 2 : 1.4}
              />
              <polygon
                points={`-4,${markerY + 14} 4,${markerY + 14} 0,${markerY + 19}`}
                fill={entry.color}
                pointerEvents="none"
              />
              <text
                x={0}
                y={markerY + 11}
                textAnchor="middle"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontWeight="700"
                fontSize="10"
                fill="#FFFFFF"
                pointerEvents="none"
              >
                {checkpointGlyph(entry.action.kind)}
              </text>
              {/* Larger transparent hit target for easier hover/click */}
              <rect
                x={-9}
                y={markerY - 2}
                width={18}
                height={24}
                fill="transparent"
              />
            </g>
          );
        })}
      </svg>

      {tooltipIndex != null && tooltipBucket && tooltipLeftPx != null ? (
        <div
          className="pointer-events-none absolute top-3 z-10 w-[8.25rem] rounded-lg border border-gray-3 bg-white/95 p-2.5 shadow-lg backdrop-blur-sm"
          style={{
            left: `${tooltipLeftPx + tooltipShiftX}px`,
          }}
          aria-hidden
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-dark-4">
            {formatTimelineTooltipLabel(tooltipBucket, granularity)}
          </p>
          <ul className="mt-1.5 space-y-1">
            {renderSeries.map((entry) => (
              <li
                key={`tooltip-${entry.metric}`}
                className="flex items-center justify-between gap-2 text-[11px] text-dark-3"
              >
                <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate">{entry.shortLabel}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-dark">
                  {formatTimelineValue(entry.values[tooltipIndex] ?? 0, entry.unit)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hoveredCheckpoint && checkpointTooltipLeftPx != null ? (
        <div
          className="pointer-events-none absolute top-2 z-20 w-[10.5rem] rounded-lg border border-gray-3 bg-white/95 p-2.5 shadow-lg backdrop-blur-sm"
          style={{
            left: `${checkpointTooltipLeftPx + checkpointTooltipShiftX}px`,
          }}
          aria-hidden
        >
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: hoveredCheckpoint.color }}
            />
            <span className="text-[11px] font-semibold text-dark">{hoveredCheckpoint.label}</span>
          </div>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-dark-4">
            {formatCheckpointTimestamp(hoveredCheckpoint.action.occurredAt)}
          </p>
          {hoveredCheckpoint.action.productTitle ? (
            <p className="mt-1 line-clamp-2 text-[10px] text-dark-3">
              {hoveredCheckpoint.action.productTitle}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={cn("mt-3 flex flex-wrap gap-2 text-[11px] text-dark-4")}>
        {series.map((entry) => (
          <span
            key={`legend-${entry.metric}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-3 bg-white px-2 py-1"
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-medium text-dark">{entry.label}</span>
            <span className="text-dark-4">·</span>
            <span className="tabular-nums">
              {formatTimelineValue(entry.total, entry.unit)}
              {entry.unit === "percent" ? "" : " total"}
            </span>
          </span>
        ))}
      </div>

      {checkpointPositions.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-dark-4">
          <span className="font-semibold uppercase tracking-wide text-dark-3">
            Checkpoints
          </span>
          {Object.entries(APPLIED_ACTION_KIND_META).map(([kind, meta]) => {
            const count = checkpointPositions.filter((entry) => entry.action.kind === kind).length;
            if (count === 0) return null;
            return (
              <span key={`cp-legend-${kind}`} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: meta.color }} />
                <span className="text-dark-3">{meta.label}</span>
                <span className="tabular-nums text-dark-4">×{count}</span>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
