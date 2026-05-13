"use client";

import React, { useId, useState } from "react";
import { useConceptionAdminData } from "@/hooks/useConceptionAdminData";
import type {
  ConceptionAlertDto,
  ConceptionOverviewDto,
  ConceptionRecommendationDto,
} from "@/types/conception-admin";
import {
  AlertTriangle,
  BarChart2,
  Bell,
  CheckCircle2,
  Clock,
  Lightbulb,
  Play,
  Settings2,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Opaque panels — compact padding, warm body text */
const conceptionPanel = cn(
  "rounded-lg border border-zinc-700/90 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-4 text-zinc-200 transition-all duration-300 ease-out",
  "hover:border-orange-400/60 hover:-translate-y-0.5 sm:p-4"
);

const conceptionPanelCompact = cn(
  "rounded-lg border border-zinc-700/90 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-4 text-zinc-200 transition-all duration-300",
  "hover:border-orange-400/55 hover:-translate-y-0.5"
);

/** Suppress default browser focus ring (often blue) on mock dashboard controls. */
const conceptionNoFocusRing =
  "outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0";

function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const fillWidth = clamped > 0 ? Math.max(clamped, 12) : 0;
  return (
    <div
      className={cn(
        "h-2.5 overflow-hidden rounded-full border border-zinc-300/90 bg-zinc-100",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-[#FB923C] transition-[width] duration-700 ease-out"
        style={{ width: `${fillWidth}%`, minWidth: clamped > 0 ? "14px" : "0px" }}
      />
    </div>
  );
}

const NAV = [
  "Dashboard",
  "Conversion Funnel",
  "User Behavior",
  "AI Recommendations",
  "Alerts",
  "Security",
] as const;

type NavItem = (typeof NAV)[number];

function resolveNavSection(title: string, recommendation: string): NavItem {
  const text = `${title} ${recommendation}`.toLowerCase();
  if (/cart|checkout|payment|conversion|funnel|panier|paiement|tunnel|formulaire/.test(text)) {
    return "Conversion Funnel";
  }
  if (/behavior|scroll|session|user|heatmap|journey|comportement|utilisateur|parcours/.test(text)) {
    return "User Behavior";
  }
  if (/alert|incident|security|fraud|bot|alerte|sécurité|securité|fraude/.test(text)) {
    return "Alerts";
  }
  return "Dashboard";
}

const KPI = [
  { label: "Conversion Rate", value: "2.4%", delta: "+0.3%", deltaPositive: true },
  { label: "Unique Visitors", value: "12,847", delta: "+12.5%", deltaPositive: true },
  { label: "Abandoned Carts", value: "68%", delta: "-5.2%", deltaPositive: false },
  { label: "Page Views", value: "48,392", delta: "+8.1%", deltaPositive: true },
] as const;

const TOP_PAGES = [
  { page: "/products/smartphone-x", views: "8,234", conversions: "245", rate: "2.98%" },
  { page: "/products/laptop-pro", views: "6,891", conversions: "198", rate: "2.87%" },
  { page: "/products/headphones-wireless", views: "5,432", conversions: "156", rate: "2.87%" },
  { page: "/checkout", views: "4,123", conversions: "98", rate: "2.38%" },
  { page: "/products/camera-dslr", views: "3,876", conversions: "87", rate: "2.24%" },
] as const;

const DEVICES = [
  { name: "Mobile", pct: 58, color: "bg-orange-500" },
  { name: "Desktop", pct: 32, color: "bg-amber-500" },
  { name: "Tablet", pct: 10, color: "bg-orange-800" },
] as const;

/** Fallback curve when no hourly series yet. */
const TRAFFIC_FALLBACK = [0.15, 0.22, 0.18, 0.35, 0.55, 0.72, 0.68, 0.58, 0.62, 0.78, 0.85, 0.92, 0.88, 0.75, 0.7, 0.82, 0.9, 0.95, 0.88, 0.72, 0.55, 0.42, 0.28, 0.2];

const TIME_LABELS = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"];

function TrafficChart({ series }: { series: number[] }) {
  const pts = series.length >= 8 ? series : TRAFFIC_FALLBACK;
  const gid = useId().replace(/:/g, "");
  const fillId = `trafficFill-${gid}`;
  const strokeId = `trafficStroke-${gid}`;
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
          <stop offset="0%" stopColor="rgb(251 146 60)" stopOpacity="0.35" />
          <stop offset="55%" stopColor="rgb(245 158 11)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="rgb(234 88 12)" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(253 186 116)" />
          <stop offset="50%" stopColor="rgb(251 146 60)" />
          <stop offset="100%" stopColor="rgb(234 88 12)" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={pad.left}
          y1={pad.top + innerH * t}
          x2={w - pad.right}
          y2={pad.top + innerH * t}
          stroke="rgb(63 63 70 / 0.45)"
          strokeWidth="1"
        />
      ))}
      <text x={4} y={pad.top + 4} className="fill-zinc-600 text-[9px]">600</text>
      <text x={4} y={pad.top + innerH * 0.25 + 3} className="fill-zinc-600 text-[9px]">450</text>
      <text x={4} y={pad.top + innerH * 0.5 + 3} className="fill-zinc-600 text-[9px]">300</text>
      <text x={4} y={pad.top + innerH * 0.75 + 3} className="fill-zinc-600 text-[9px]">150</text>
      <text x={4} y={baseY + 2} className="fill-zinc-600 text-[9px]">0</text>
      <path d={areaD} fill={`url(#${fillId})`} className="opacity-90" />
      <polyline
        points={polyPts}
        fill="none"
        stroke={`url(#${strokeId})`}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-conception-chart-line"
      />
      {TIME_LABELS.map((label, i) => (
        <text
          key={label}
          x={pad.left + (i / (TIME_LABELS.length - 1)) * innerW}
          y={h - 6}
          textAnchor="middle"
          className="fill-zinc-600 text-[9px]"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

const FUNNEL_STEPS = [
  {
    title: "Product Page",
    count: "1,000",
    fromPrev: "100.0% of previous",
    overall: "100.0%",
    abandon: null as string | null,
    barPct: 100,
  },
  {
    title: "Add to Cart",
    count: "320",
    fromPrev: "32.0% of previous",
    overall: "32.0%",
    abandon: "68.0% abandonment",
    barPct: 32,
  },
  {
    title: "Checkout Started",
    count: "85",
    fromPrev: "26.6% of previous",
    overall: "8.5%",
    abandon: "73.4% abandonment",
    barPct: 8.5,
  },
  {
    title: "Order Completed",
    count: "40",
    fromPrev: "47.1% of previous",
    overall: "4.0%",
    abandon: "52.9% abandonment",
    barPct: 4,
  },
] as const;

const FUNNEL_SUMMARY = [
  {
    label: "Overall Conversion Rate",
    value: "4.0%",
    sub: "+0.3% vs last week",
    subTone: "emerald" as const,
  },
  {
    label: "Average Drop-off per Step",
    value: "64.7%",
    sub: "3 critical steps detected",
    subTone: "amber" as const,
  },
  {
    label: "Potential Revenue Lost",
    value: "48,250 DA",
    sub: "960 missed conversions",
    subTone: "rose" as const,
  },
] as const;

const FRICTION_ITEMS = [
  {
    priority: "HIGH PRIORITY",
    priorityClass: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    title: "Add to Cart → Payment",
    body: "68% abandonment — main blocker identified",
    reco: "Reduce the number of checkout steps",
  },
  {
    priority: "MEDIUM PRIORITY",
    priorityClass: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    title: "Payment → Completion",
    body: "53% abandonment — 70% of drop-offs come from mobile users",
    reco: "Optimize the form for mobile — enable autocomplete",
  },
] as const;

const USER_JOURNEYS = [
  {
    status: "ABANDONED" as const,
    users: "342 users",
    duration: "4m 23s",
    rate: "0%",
    path: "Homepage → Catalog → Product → Cart → Abandon",
  },
  {
    status: "CONVERTED" as const,
    users: "127 users",
    duration: "6m 12s",
    rate: "100%",
    path: "Homepage → Product → Cart → Payment → Success",
  },
  {
    status: "ABANDONED" as const,
    users: "289 users",
    duration: "2m 08s",
    rate: "0%",
    path: "Search → Product → Abandon",
  },
  {
    status: "CONVERTED" as const,
    users: "93 users",
    duration: "8m 45s",
    rate: "100%",
    path: "Homepage → Catalog → Filters → Product → Cart → Success",
  },
] as const;

const HEATMAP_DEPTH_BANDS = [
  { label: "75-100%", tone: "from-rose-600/90 to-orange-500/70" },
  { label: "50-75%", tone: "from-orange-500/50 to-amber-500/40" },
  { label: "25-50%", tone: "from-amber-500/30 to-yellow-500/25" },
  { label: "0-25%", tone: "from-zinc-700/50 to-zinc-800/60" },
] as const;

const SCROLL_CLICK_ITEMS = [
  { label: '"Add to cart" button', clicks: "8,234 clicks" },
  { label: "Product images", clicks: "6,891 clicks" },
  { label: "Size selection", clicks: "5,432 clicks" },
  { label: "Description tab", clicks: "3,876 clicks" },
  { label: "Customer reviews", clicks: "2,654 clicks" },
] as const;

const SESSION_REPLAYS = [
  { id: "4236" },
  { id: "4237" },
  { id: "4238" },
] as const;

function HeatmapMock() {
  const axis = ["0", "0.25", "0.5", "0.75", "1"];
  return (
    <div className="mt-4">
      <div className="flex gap-2 sm:gap-3">
        <div className="flex min-h-[160px] w-14 flex-col justify-between py-1.5 text-[10px] leading-tight text-zinc-600 sm:w-16 sm:text-xs">
          {HEATMAP_DEPTH_BANDS.map((b) => (
            <span key={b.label} className="text-right">
              {b.label}
            </span>
          ))}
        </div>
        <div className="min-h-[160px] flex-1">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-orange-500/30 bg-zinc-950">
            {HEATMAP_DEPTH_BANDS.map((b, i) => (
              <div
                key={b.label}
                style={{ animationDelay: `${i * 350}ms` }}
                className={cn(
                  "flex flex-1 items-center justify-center bg-gradient-to-r text-[10px] font-medium text-zinc-900/85",
                  b.tone,
                  "animate-[pulse_5s_ease-in-out_infinite] motion-reduce:animate-none"
                )}
              >
                <span className="sr-only">{b.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-zinc-600">Interactive heatmap visualization</p>
          <p className="mt-1 text-center text-sm font-medium text-zinc-400">Product page — mobile view</p>
          <div className="mt-3 flex justify-between px-1 text-[10px] tabular-nums text-zinc-600 sm:text-xs">
            {axis.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserBehaviorContent() {
  return (
    <>
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-200">Behavioral Analysis</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Real-time tracking of interactions and user journeys
        </p>
      </div>

      <div className={cn(conceptionPanel)}>
        <h4 className="text-base font-semibold tracking-tight text-zinc-200">Top User Journeys</h4>
        <p className="mt-1 text-sm text-zinc-500">Most frequent navigation sequences</p>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {USER_JOURNEYS.map((j) => {
            const converted = j.status === "CONVERTED";
            return (
              <div
                key={j.path}
                className={cn(
                  "rounded-xl border p-4 backdrop-blur-sm transition-all duration-500 ease-out sm:p-5",
                  "hover:-translate-y-0.5",
                  converted
                    ? "border-orange-500/40 bg-gradient-to-br from-orange-950/80 to-zinc-950 hover:border-orange-400/55"
                    : "border-rose-400/35 bg-gradient-to-br from-rose-500/10 to-fuchsia-950/20 hover:border-rose-300/45"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      converted ? "bg-orange-500/20 text-orange-200" : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {j.status}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-orange-100">{j.rate}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
                  <span>{j.users}</span>
                  <span className="tabular-nums text-zinc-400">{j.duration}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">{j.path}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className={cn(conceptionPanel)}>
          <h4 className="text-base font-semibold tracking-tight text-zinc-200">Click Heatmap</h4>
          <p className="mt-1 text-sm text-zinc-500">Most interactive areas</p>
          <HeatmapMock />
        </div>

        <div className={cn(conceptionPanel)}>
          <h4 className="text-base font-semibold tracking-tight text-zinc-200">Scroll Depth</h4>
          <p className="mt-1 text-sm text-zinc-500">User scroll analysis</p>
          <ul className="mt-3 divide-y divide-zinc-800">
            {SCROLL_CLICK_ITEMS.map((item, i) => (
              <li key={item.label} className="py-2.5 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm text-zinc-300">{item.label}</span>
                  <span className="text-sm font-medium tabular-nums text-orange-300">{item.clicks}</span>
                </div>
                {i === 0 ? (
                  <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
                        Attention point
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        Only 18% of users reach the bottom of the product page where customer reviews are located.
                      </p>
                    </div>
                  </div>
                ) : null}
                {i === 2 ? (
                  <div className="mt-3 flex gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Recommendation</p>
                      <p className="mt-1 text-sm text-zinc-300">
                        Move customer reviews higher on the page, before the detailed description section.
                      </p>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={cn(conceptionPanel)}>
        <h4 className="text-base font-semibold tracking-tight text-zinc-200">Session Recordings</h4>
        <p className="mt-1 text-sm text-zinc-500">Replay user sessions with cart abandonment</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SESSION_REPLAYS.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex flex-col rounded-xl border border-zinc-700 bg-zinc-950 p-4 transition-all duration-500",
                "hover:-translate-y-0.5 hover:border-orange-500/50"
              )}
            >
              <p className="text-sm font-semibold text-zinc-200">Session #{s.id}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-zinc-600">Duration</dt>
                  <dd className="font-medium tabular-nums text-zinc-300">4m 23s</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-600">Device</dt>
                  <dd className="font-medium text-zinc-300">iPhone 13</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-600">Status</dt>
                  <dd className="font-medium text-rose-300">Cart abandonment</dd>
                </div>
              </dl>
              <button
                type="button"
                className={cn(
                  conceptionNoFocusRing,
                  "mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-orange-500/45 bg-orange-950/80 px-3 py-2 text-sm font-medium text-orange-100 transition hover:bg-orange-900/90"
                )}
              >
                <Play className="h-4 w-4 shrink-0 text-orange-300" aria-hidden />
                Watch replay
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const AI_REC_SUMMARY = [
  { label: "Total Potential Revenue", value: "31,050 DA" },
  { label: "Active Recommendations", value: "5" },
  { label: "Average Impact", value: "+4.1%" },
] as const;

const AI_RECOMMENDATIONS = [
  {
    priority: "HIGH PRIORITY",
    tier: "high" as const,
    impact: "+8% conversion",
    title: "Optimize the mobile checkout form",
    confidence: 94,
    analyse:
      "70% of drop-offs on the checkout page come from mobile users. Analysis shows the address form has 12 fields, which is excessive on a small screen.",
    recommendation:
      "Enable autocomplete, reduce to 6 essential fields, and show a progress bar.",
    revenue: "12,400 DA",
    implementation: "2-3 days",
    roi: "12.4x",
  },
  {
    priority: "HIGH PRIORITY",
    tier: "high" as const,
    impact: "+5.2% conversion",
    title: "Add guest checkout",
    confidence: 89,
    analyse:
      "The abandonment rate between add to cart and checkout is 68%. Behavioral analysis shows 42% of users leave after seeing the mandatory sign-up form.",
    recommendation:
      'Offer a "Checkout as guest" option to reduce friction. Collect only the information you need.',
    revenue: "8,750 DA",
    implementation: "3-4 days",
    roi: "12.4x",
  },
  {
    priority: "MEDIUM PRIORITY",
    tier: "medium" as const,
    impact: "+3.1% conversion",
    title: "Improve load time",
    confidence: 82,
    analyse:
      "Average product page load time is 4.2 seconds. 23% of visitors leave before the page finishes loading.",
    recommendation:
      "Compress product images (WebP), implement lazy loading, and enable browser caching.",
    revenue: "4,200 DA",
    implementation: "1-2 days",
    roi: "12.4x",
  },
  {
    priority: "MEDIUM PRIORITY",
    tier: "medium" as const,
    impact: "+2.8% conversion",
    title: "Show shipping fees earlier",
    confidence: 76,
    analyse:
      "Scroll data shows only 34% of users scroll to shipping fees on the product page. Fees shown at checkout cause 18% of abandonments.",
    recommendation:
      'Show estimated shipping fees directly on the product page, near the "Add to cart" button.',
    revenue: "3,600 DA",
    implementation: "1 day",
    roi: "12.4x",
  },
  {
    priority: "LOW PRIORITY",
    tier: "low" as const,
    impact: "+1.5% conversion",
    title: "Improve search filters",
    confidence: 71,
    analyse:
      "Users who use filters convert 2.3x more often. Currently, only 28% of visitors interact with filters.",
    recommendation:
      "Make filters more visible, add popular quick filters, and show the result count in real time.",
    revenue: "2,100 DA",
    implementation: "2-3 days",
    roi: "12.4x",
  },
] as const;

function aiRecPriorityStyles(tier: ConceptionRecommendationDto["priority"]) {
  if (tier === "critical") {
    return {
      badge: "bg-rose-600 text-white ring-1 ring-rose-400/60",
      border: "border-rose-500/40",
    };
  }
  if (tier === "high") {
    return {
      badge: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/35",
      border: "border-rose-500/25",
    };
  }
  if (tier === "medium") {
    return {
      badge: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/35",
      border: "border-amber-500/20",
    };
  }
  return {
    badge: "bg-zinc-700/40 text-zinc-300 ring-1 ring-zinc-600/50",
    border: "border-zinc-600/50",
  };
}

function AiRecommendationsContent({
  recommendations,
  overview,
  onDismissRecommendation,
  onNavigateSection,
  onClearAllRecommendations,
}: {
  recommendations: ConceptionRecommendationDto[];
  overview: ConceptionOverviewDto | null;
  onDismissRecommendation?: (id: string) => Promise<boolean>;
  onNavigateSection?: (section: NavItem) => void;
  onClearAllRecommendations?: () => Promise<boolean>;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [clearAllBusy, setClearAllBusy] = useState(false);
  const usingPlaceholderRecs = recommendations.length === 0;
  const recs =
    recommendations.length > 0 ?
      recommendations.map((r) => ({
        key: r.id,
        priority: r.priorityLabel,
        tier: r.priority,
        impact: r.impactLabel ?? "—",
        title: r.title,
        confidence: r.confidence,
        analyse: r.analysis,
        recommendation: r.recommendation,
        revenue: r.revenueHint ?? "—",
        implementation: r.implementationHint ?? "—",
        roi: r.roiHint ?? "—",
      }))
    : AI_RECOMMENDATIONS.map((r) => ({
        key: r.title,
        priority: r.priority,
        tier: r.tier,
        impact: r.impact,
        title: r.title,
        confidence: r.confidence,
        analyse: r.analyse,
        recommendation: r.recommendation,
        revenue: r.revenue,
        implementation: r.implementation,
        roi: r.roi,
      }));

  const summary =
    recommendations.length > 0 ?
      [
        {
          label: "Active recommendations",
          value: String(recommendations.length),
        },
        {
          label: "Events (7d)",
          value: overview ? new Intl.NumberFormat("en-US").format(overview.totalEvents7d) : "—",
        },
        {
          label: "Average confidence",
          value: `${Math.round(recommendations.reduce((a, b) => a + b.confidence, 0) / recommendations.length)}%`,
        },
      ]
    : AI_REC_SUMMARY;

  return (
    <>
      <div>
        <h3 className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-orange-200">
          <Lightbulb className="h-5 w-5" aria-hidden />
          AI Recommendations
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Rules engine + micro-event data (extensible with LLM / ML)
        </p>
        {usingPlaceholderRecs ? (
          <p className="mt-2 rounded-lg border border-amber-400/55 bg-gradient-to-r from-orange-900/65 via-amber-800/45 to-orange-900/65 px-3 py-2 text-xs font-medium text-amber-100">
            Demo mode: placeholder recommendations shown until enough real signals are received.
          </p>
        ) : null}
        {!usingPlaceholderRecs && onClearAllRecommendations ?
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={clearAllBusy}
              onClick={() => {
                if (
                  !window.confirm(
                    "Erase every AI recommendation stored in the database? You can run Analyze again to generate new cards."
                  )
                ) {
                  return;
                }
                setClearAllBusy(true);
                void onClearAllRecommendations().finally(() => setClearAllBusy(false));
              }}
              className={cn(
                conceptionNoFocusRing,
                "rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-orange-400/50 hover:bg-zinc-800 hover:text-orange-200 disabled:opacity-50"
              )}
            >
              {clearAllBusy ? "Erasing…" : "Erase all recommendations"}
            </button>
          </div>
        : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {summary.map((s) => (
          <div key={s.label} className={cn(conceptionPanelCompact, "border-orange-500/25")}>
            <p className="text-sm text-zinc-500">{s.label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-orange-100">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {recs.map((rec) => {
          const st = aiRecPriorityStyles(rec.tier);
          return (
            <article
              key={rec.key}
              className={cn(conceptionPanel, st.border)}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <span className={`inline-flex w-fit rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${st.badge}`}>
                  {rec.priority}
                </span>
                <p className="text-sm text-zinc-400">
                  <span className="text-zinc-600">Estimated impact: </span>
                  <span className="font-semibold text-orange-300">{rec.impact}</span>
                </p>
              </div>

              <div className="mt-3 flex flex-col gap-3 border-t border-zinc-800 pt-3 sm:flex-row sm:items-start sm:justify-between">
                <h4 className="text-base font-semibold leading-snug text-zinc-200 sm:max-w-[65%]">{rec.title}</h4>
                <div className="shrink-0 sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">AI confidence</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-orange-200">{rec.confidence}%</p>
                  <ProgressBar value={rec.confidence} className="mt-2 sm:w-28 sm:ml-auto" />
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-950/25 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-300/90">
                  <BarChart2 className="h-4 w-4" aria-hidden />
                  Analysis
                </div>
                <p className="mt-2 text-sm leading-relaxed text-sky-100/90">{rec.analyse}</p>
              </div>

              <div className="mt-3 rounded-lg border border-orange-500/35 bg-orange-950/45 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">Recommendation</p>
                <p className="mt-2 text-sm leading-relaxed text-orange-100/90">{rec.recommendation}</p>
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-3 border-t border-zinc-800 pt-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-zinc-600">Estimated revenue</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-orange-100">{rec.revenue}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-600">Implementation time</dt>
                  <dd className="mt-1 text-lg font-semibold text-zinc-300">{rec.implementation}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-600">Estimated ROI</dt>
                  <dd className="mt-1 text-lg font-semibold text-orange-300">{rec.roi}</dd>
                </div>
              </dl>

              {expandedKey === rec.key ?
                <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Full details</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{rec.analyse}</p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">{rec.recommendation}</p>
                </div>
              : null}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={usingPlaceholderRecs || busyKey === rec.key}
                  onClick={() => onNavigateSection?.(resolveNavSection(rec.title, rec.recommendation))}
                  className={cn(
                    conceptionNoFocusRing,
                    "rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:scale-[1.02] hover:from-orange-400 hover:to-amber-400 active:scale-[0.99] disabled:opacity-50"
                  )}
                >
                  Implement this recommendation
                </button>
                <button
                  type="button"
                  disabled={usingPlaceholderRecs}
                  onClick={() => setExpandedKey((current) => (current === rec.key ? null : rec.key))}
                  className={cn(
                    conceptionNoFocusRing,
                    "rounded-lg border border-orange-400/45 bg-zinc-800 px-4 py-2 text-sm font-medium text-orange-100 transition hover:border-orange-300 hover:bg-zinc-700 hover:text-orange-50 disabled:opacity-50"
                  )}
                >
                  {expandedKey === rec.key ? "Hide details" : "More details"}
                </button>
                <button
                  type="button"
                  disabled={usingPlaceholderRecs || busyKey === rec.key}
                  onClick={() => {
                    if (usingPlaceholderRecs) return;
                    setBusyKey(rec.key);
                    void onDismissRecommendation?.(rec.key).finally(() => setBusyKey(null));
                  }}
                  className={cn(
                    conceptionNoFocusRing,
                    "rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-orange-200 disabled:opacity-50"
                  )}
                >
                  Dismiss
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

type AlertSummaryIcon = "alert" | "clock" | "check" | "zap";

type AlertSummaryRow = {
  label: string;
  value: string;
  icon: AlertSummaryIcon;
  sub: { text: string; className: string } | null;
  tag: string | null;
};

const ALERTS_SUMMARY: AlertSummaryRow[] = [
  {
    label: "Active Alerts",
    value: "4",
    icon: "alert",
    sub: { text: "2 critical", className: "font-medium text-red-600" },
    tag: null,
  },
  {
    label: "Under Investigation",
    value: "2",
    icon: "clock",
    sub: { text: "Average time: 45min", className: "text-zinc-600" },
    tag: null,
  },
  {
    label: "Resolved (24h)",
    value: "12",
    icon: "check",
    sub: { text: "-25% vs yesterday", className: "font-medium text-emerald-600" },
    tag: null,
  },
  {
    label: "Response Time",
    value: "8min",
    icon: "zap",
    sub: null,
    tag: "Average",
  },
];

function AlertSummaryIconBadge({ kind }: { kind: AlertSummaryIcon }) {
  const base = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11";
  if (kind === "alert") {
    return (
      <div className={cn(base, "bg-red-100")} aria-hidden>
        <AlertTriangle className="h-5 w-5 text-red-600" strokeWidth={2} />
      </div>
    );
  }
  if (kind === "clock") {
    return (
      <div className={cn(base, "bg-orange-100")} aria-hidden>
        <Clock className="h-5 w-5 text-orange-600" strokeWidth={2} />
      </div>
    );
  }
  if (kind === "check") {
    return (
      <div className={cn(base, "bg-emerald-100")} aria-hidden>
        <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
      </div>
    );
  }
  return (
    <div className={cn(base, "bg-orange-100")} aria-hidden>
      <Zap className="h-5 w-5 text-orange-600" strokeWidth={2} />
    </div>
  );
}

const ALERT_INCIDENTS = [
  {
    severity: "CRITICAL",
    tier: "critical" as const,
    title: "Conversion drop",
    status: "ACTIVE",
    statusKind: "active" as const,
    description: "Conversion rate is 28% below the 7-day average",
    detail: "Detected at 2:23 PM. Current rate: 1.7% (average: 2.4%)",
    timeAgo: "12 minutes ago",
    affected: "847 users affected",
  },
  {
    severity: "HIGH",
    tier: "high" as const,
    title: "Technical error",
    status: "ACTIVE",
    statusKind: "active" as const,
    description: "JavaScript errors detected on the checkout page",
    detail: '8.3% of sessions hit the error "Cannot read property cartTotal"',
    timeAgo: "34 minutes ago",
    affected: "234 users affected",
  },
  {
    severity: "MEDIUM",
    tier: "medium" as const,
    title: "Mass cart abandonment",
    status: "UNDER INVESTIGATION",
    statusKind: "investigation" as const,
    description: "Cart abandonment rate > 85% over the last 2 hours",
    detail: "Unusual concentration of drop-offs among iOS users",
    timeAgo: "1 hour ago",
    affected: "456 users affected",
  },
  {
    severity: "LOW",
    tier: "low" as const,
    title: "Performance issue",
    status: "UNDER INVESTIGATION",
    statusKind: "investigation" as const,
    description: "Average catalog page load time > 4 seconds",
    detail: "Latency spikes detected between 1:00 PM and 3:00 PM",
    timeAgo: "2 hours ago",
    affected: "1,234 users affected",
  },
] as const;

const ALERTS_RESOLVED = [
  {
    title: "Sudden traffic spike (+350%) resolved",
    category: "Conversion drop",
    time: "3 hours ago",
    duration: "Duration: 45 minutes",
    detail: "Rate < average -20%",
  },
  {
    title: "Database connection error resolved",
    category: "JavaScript errors",
    time: "5 hours ago",
    duration: "Duration: 12 minutes",
    detail: "Errors > 5% of sessions",
  },
] as const;

const ALERT_RULES = [
  { name: "Abnormal traffic", condition: "Increase > 300% in 15min" },
  { name: "Load time", condition: "Average time > 4 seconds" },
  { name: "Cart abandonment", condition: "Rate > 80% over 2h" },
] as const;

function alertSeverityPill(tier: (typeof ALERT_INCIDENTS)[number]["tier"]) {
  if (tier === "critical") return "bg-red-600 text-white";
  if (tier === "high") return "bg-orange-500 text-white";
  if (tier === "medium") return "bg-amber-500 text-amber-950";
  return "bg-zinc-500 text-white";
}

function alertIncidentCardSurface(tier: (typeof ALERT_INCIDENTS)[number]["tier"]) {
  if (tier === "critical") {
    return "border-l-[6px] border-l-red-500 border border-rose-100 bg-rose-50/95";
  }
  if (tier === "high") {
    return "border-l-[6px] border-l-orange-500 border border-orange-100 bg-orange-50/95";
  }
  if (tier === "medium") {
    return "border-l-[6px] border-l-amber-500 border border-amber-100 bg-amber-50/90";
  }
  return "border-l-[6px] border-l-zinc-400 border border-zinc-200 bg-zinc-50";
}

function alertDtoToIncident(a: ConceptionAlertDto) {
  const sev =
    a.severity === "critical" ? "CRITICAL"
    : a.severity === "high" ? "HIGH"
    : a.severity === "medium" ? "MEDIUM"
    : "LOW";
  return {
    severity: sev,
    tier: a.severity,
    title: a.title,
    status: "ACTIVE",
    statusKind: "active" as const,
    description: a.description,
    detail: a.detail ?? "",
    timeAgo: new Date(a.createdAt).toLocaleString("en-US"),
    affected:
      a.affectedSessionsEstimate != null ?
        `${new Intl.NumberFormat("en-US").format(a.affectedSessionsEstimate)} session(s)`
      : "—",
  };
}

function SecurityContent({ overview }: { overview: ConceptionOverviewDto | null }) {
  const s = overview?.security;
  return (
    <div className="rounded-xl border border-orange-500/25 bg-zinc-900 p-3 sm:p-4">
      <h3 className="text-lg font-semibold text-zinc-200">Security &amp; data integrity</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Bot / scraping heuristics on micro-events (7-day window)
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={cn(conceptionPanelCompact)}>
          <p className="text-sm text-zinc-500">High-velocity sessions</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-orange-200">
            {s ? new Intl.NumberFormat("en-US").format(s.highVelocitySessions) : "—"}
          </p>
        </div>
        <div className={cn(conceptionPanelCompact)}>
          <p className="text-sm text-zinc-500">Suspicious sessions (aggregate)</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-rose-200">
            {s ? new Intl.NumberFormat("en-US").format(s.suspiciousSessions7d) : "—"}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-zinc-400">
        {(s?.notes ?? ["Loading…"]).map((n) => (
          <li key={n} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlertsContent({
  alerts,
  onDismissAlert,
  onNavigateSection,
}: {
  alerts: ConceptionAlertDto[];
  onDismissAlert?: (id: string, disposition: "resolved" | "ignored") => Promise<boolean>;
  onNavigateSection?: (section: NavItem) => void;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const usingPlaceholderAlerts = alerts.length === 0;
  const incidents =
    alerts.length > 0 ?
      alerts.map((x) => ({ ...alertDtoToIncident(x), key: x.id }))
    : ALERT_INCIDENTS.map((x, i) => ({ ...x, key: `demo-${i}` }));
  const activeCount = alerts.length > 0 ? alerts.length : Number(ALERTS_SUMMARY[0]?.value ?? 0);
  const summary =
    alerts.length > 0 ?
      ALERTS_SUMMARY.map((row, i) =>
        i === 0 ?
          { ...row, value: String(activeCount), sub: { text: "Conception engine data", className: "text-zinc-600" } }
        : row
      )
    : ALERTS_SUMMARY;

  return (
    <div
      className={cn(
        "rounded-xl p-3 sm:p-4",
        usingPlaceholderAlerts ?
          "border border-orange-300/70 bg-gradient-to-br from-orange-50 via-amber-50/80 to-white"
        : "border border-zinc-200/90 bg-zinc-100"
      )}
    >
      {usingPlaceholderAlerts ? (
        <p className="mb-3 rounded-lg border border-orange-300/75 bg-gradient-to-r from-orange-100 to-amber-50 px-3 py-2 text-xs font-semibold text-orange-800">
          Demo mode: placeholder alerts shown while waiting for real incidents.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {summary.map((s) => (
          <div
            key={s.label}
            className={cn(
              "flex gap-3 rounded-xl p-3 sm:p-3.5",
              usingPlaceholderAlerts ?
                "border border-orange-200/80 bg-white"
              : "border border-zinc-200/80 bg-white"
            )}
          >
            <AlertSummaryIconBadge kind={s.icon} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium leading-tight text-zinc-500 sm:text-xs">{s.label}</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900 sm:text-2xl">{s.value}</p>
              {s.sub ? <p className={cn("mt-1 text-xs leading-snug", s.sub.className)}>{s.sub.text}</p> : null}
              {s.tag ? (
                <span className="mt-1.5 inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {s.tag}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-orange-200/70 bg-gradient-to-br from-white via-orange-50/45 to-amber-50/35 p-3 sm:mt-4 sm:p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
            <Bell className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h4 className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-700 sm:text-base">
              <Bell className="h-4 w-4" aria-hidden />
              Active Alerts
            </h4>
            <p className="text-[11px] leading-snug text-zinc-600 sm:text-xs">
              Ongoing incidents that need attention
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          {incidents.map((a) => {
            const activeStatus = a.statusKind === "active";
            return (
              <article
                key={"key" in a ? (a as { key: string }).key : a.title}
                className={cn(
                  "overflow-hidden rounded-r-lg rounded-l-sm p-3 sm:p-3.5",
                  alertIncidentCardSurface(a.tier)
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-[11px]",
                      alertSeverityPill(a.tier)
                    )}
                  >
                    {a.severity}
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-[11px]",
                      activeStatus
                        ? "border-2 border-red-500 bg-white text-red-600"
                        : "border-2 border-zinc-400 bg-white text-zinc-700"
                    )}
                  >
                    {a.status}
                  </span>
                </div>
                <h5 className="mt-2 text-sm font-semibold text-zinc-900 sm:text-base">{a.title}</h5>
                <p className="mt-1 text-sm leading-snug text-zinc-700">{a.description}</p>
                <p className="mt-1 text-sm leading-snug text-zinc-600">{a.detail}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                    {a.timeAgo}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                    {a.affected}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    disabled={usingPlaceholderAlerts}
                    onClick={() => onNavigateSection?.("Conversion Funnel")}
                    className={cn(
                      conceptionNoFocusRing,
                      "rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-center text-sm font-semibold text-zinc-950 transition hover:from-orange-400 hover:to-amber-400 disabled:opacity-50"
                    )}
                  >
                    Review in detail
                  </button>
                  <button
                    type="button"
                    disabled={usingPlaceholderAlerts || busyKey === ("key" in a ? a.key : a.title)}
                    onClick={() => {
                      const alertId = "key" in a ? a.key : a.title;
                      setBusyKey(alertId);
                      void onDismissAlert?.(alertId, "resolved").finally(() => setBusyKey(null));
                    }}
                    className={cn(
                      conceptionNoFocusRing,
                      "rounded-lg border border-orange-300 bg-white px-4 py-2 text-center text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:opacity-50"
                    )}
                  >
                    Mark as resolved
                  </button>
                  <button
                    type="button"
                    disabled={usingPlaceholderAlerts || busyKey === ("key" in a ? a.key : a.title)}
                    onClick={() => {
                      const alertId = "key" in a ? a.key : a.title;
                      setBusyKey(alertId);
                      void onDismissAlert?.(alertId, "ignored").finally(() => setBusyKey(null));
                    }}
                    className={cn(
                      conceptionNoFocusRing,
                      "px-2 py-2 text-left text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline sm:text-center disabled:opacity-50"
                    )}
                  >
                    Snooze
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-orange-200/55 bg-white p-3 sm:p-4">
          <h4 className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 sm:text-base">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Resolved Alerts
          </h4>
          <p className="mt-0.5 text-xs text-zinc-600">Recent history</p>
          <ul className="mt-2 space-y-2">
            {ALERTS_RESOLVED.map((r) => (
              <li key={r.title} className="border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-zinc-800">{r.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500">
                  <span>{r.category}</span>
                  <span className="text-zinc-300" aria-hidden>
                    •
                  </span>
                  <span>{r.time}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500">{r.duration}</p>
                <p className="mt-0.5 text-xs leading-snug text-zinc-600">{r.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-orange-200/55 bg-white p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-zinc-500" aria-hidden />
            <h4 className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-700 sm:text-base">
              <Settings2 className="h-4 w-4" aria-hidden />
              Alert Rules
            </h4>
          </div>
          <p className="mt-0.5 text-xs text-zinc-600">Trigger configuration</p>
          <ul className="mt-2 divide-y divide-zinc-100">
            {ALERT_RULES.map((rule) => (
              <li key={rule.name} className="flex flex-col gap-0.5 py-2 first:pt-0">
                <span className="text-sm font-medium text-zinc-800">{rule.name}</span>
                <span className="text-xs text-zinc-600 sm:text-sm">{rule.condition}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ConversionFunnelContent({ overview }: { overview: ConceptionOverviewDto | null }) {
  const steps =
    overview?.funnelSteps?.length ?
      overview.funnelSteps.map((s) => ({
        title: s.title,
        count: s.countLabel,
        fromPrev: s.fromPrevLabel,
        overall: s.overallLabel,
        abandon: s.abandonLabel,
        barPct: s.barPct,
      }))
    : FUNNEL_STEPS;

  const summary = overview?.funnelSummary?.length ? overview.funnelSummary : FUNNEL_SUMMARY;
  const friction = overview?.frictionItems?.length ? overview.frictionItems : FRICTION_ITEMS;

  return (
    <>
      <div className={cn(conceptionPanel)}>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-200">Conversion Funnel</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Data from micro-events (product → cart → checkout → Chargily journey)
        </p>

        <div className="mt-3 space-y-0">
          {steps.map((step, i) => (
            <div key={step.title}>
              <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-300">{step.title}</p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-xl font-bold tabular-nums text-orange-100">{step.count}</span>
                    <span className="text-xs text-zinc-600">{step.fromPrev}</span>
                    <span className="text-sm font-semibold tabular-nums text-orange-300">{step.overall}</span>
                    {step.abandon ? (
                      <span className="text-sm font-medium text-rose-400">{step.abandon}</span>
                    ) : null}
                  </div>
                  <ProgressBar value={step.barPct} className="mt-3 max-w-xl" />
                </div>
              </div>
              {i < steps.length - 1 ? (
                <div className="flex justify-center py-1">
                  <div className="h-5 w-px bg-gradient-to-b from-zinc-700 to-zinc-800" aria-hidden />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {summary.map((item) => (
          <div
            key={item.label}
            className={cn(conceptionPanelCompact)}
          >
            <p className="text-sm text-zinc-500">{item.label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-orange-100">{item.value}</p>
            <p
              className={`mt-2 text-xs font-medium ${
                item.subTone === "emerald"
                  ? "text-orange-300"
                  : item.subTone === "amber"
                    ? "text-amber-400"
                    : "text-rose-400"
              }`}
            >
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      <div className={cn(conceptionPanel)}>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-200">Detected Friction Points</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Funnel analytics rules (aligned with Conception engine / backend)
        </p>
        <div className="mt-3 space-y-2.5">
          {friction.map((f) => (
            <div
              key={f.title}
              className={cn(
                conceptionPanelCompact,
                f.priorityClass,
                "transition-all duration-500 hover:-translate-y-0.5"
              )}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide opacity-90">{f.priority}</p>
              <p className="mt-2 text-base font-semibold tracking-tight text-zinc-200">{f.title}</p>
              <p className="mt-2 text-sm text-zinc-400">{f.body}</p>
              <div className="mt-2 flex gap-2 rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Recommendation</p>
                  <p className="mt-0.5 text-sm leading-snug text-amber-100/90">{f.reco}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function DashboardMainContent({
  overview,
  loading,
  trafficSeries,
}: {
  overview: ConceptionOverviewDto | null;
  loading: boolean;
  trafficSeries: number[];
}) {
  const kpis = overview?.kpis?.length ? overview.kpis : KPI;
  const devices = overview?.devices?.length ? overview.devices : DEVICES;
  const topPages =
    overview?.topPages?.length ?
      overview.topPages.map((r) => ({
        page: r.page,
        views: new Intl.NumberFormat("en-US").format(r.views),
        conversions: new Intl.NumberFormat("en-US").format(r.conversions),
        rate: `${r.ratePct.toFixed(2)}%`,
      }))
    : TOP_PAGES;

  return (
    <>
      {loading ? (
        <p className="rounded-lg border border-sky-500/35 bg-sky-950/30 px-3 py-2 text-sm text-sky-100/85">
          Loading metrics…
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className={cn(
              conceptionPanelCompact,
              "backdrop-blur-sm animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both"
            )}
            style={{ animationDelay: `${i * 85}ms` }}
          >
            <p className="text-sm text-zinc-500">{k.label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-orange-100">{k.value}</p>
            <p className={`mt-1.5 text-xs font-medium ${k.deltaPositive ? "text-orange-300" : "text-rose-400"}`}>
              {k.delta}
              <span className="ml-1 font-normal text-zinc-600">vs prior period</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className={cn(conceptionPanelCompact)}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-zinc-200">Traffic &amp; Sales (24h)</h3>
              <p className="mt-0.5 text-sm leading-snug text-zinc-500">Collected event volume (normalized)</p>
            </div>
          </div>
          <div className="mt-2 -mx-1">
            <TrafficChart series={trafficSeries} />
          </div>
        </div>

        <div className={cn(conceptionPanelCompact)}>
          <h3 className="text-base font-semibold tracking-tight text-zinc-200">Devices</h3>
          <p className="mt-0.5 text-sm leading-snug text-zinc-500">Distribution (recorded browser context)</p>
          <div className="mt-3 min-h-[130px] space-y-3">
            {devices.map((d) => (
              <div key={d.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-zinc-300">{d.name}</span>
                  <span className="tabular-nums text-zinc-500">{d.pct}%</span>
                </div>
                <ProgressBar value={d.pct} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={cn(conceptionPanelCompact)}>
        <h3 className="text-base font-semibold tracking-tight text-zinc-200">Top Performing Pages</h3>
        <p className="mt-0.5 text-sm leading-snug text-zinc-500">Micro-event views and buy clicks by path</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-xs uppercase tracking-wide text-zinc-600">
                <th className="pb-2 pr-3 font-medium">Page</th>
                <th className="pb-2 pr-3 font-medium">Views</th>
                <th className="pb-2 pr-3 font-medium">Conversions</th>
                <th className="pb-2 font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {topPages.map((row) => (
                <tr
                  key={row.page}
                  className="border-b border-zinc-800 text-zinc-400 transition-colors duration-300 last:border-0 hover:bg-orange-950/40"
                >
                  <td className="py-2 pr-3 font-mono text-xs text-orange-200/90 sm:text-sm">{row.page}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.views}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.conversions}</td>
                  <td className="py-2 tabular-nums text-orange-300">{row.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-right text-xs text-zinc-600">
          {overview?.computedAt ? new Date(overview.computedAt).toLocaleString("en-US") : "—"}
        </p>
      </div>
    </>
  );
}

export default function ConceptionIntelligenceDashboard() {
  const [activeNav, setActiveNav] = useState<(typeof NAV)[number]>("Dashboard");
  const {
    overview,
    alerts,
    recommendations,
    loading,
    error,
    refresh,
    runAnalyze,
    analyzeBusy,
    analyzeMessage,
    actionMessage,
    dismissAlert,
    dismissRecommendation,
    clearAllRecommendations,
  } = useConceptionAdminData();
  const trafficSeries = overview?.trafficHourlyNormalized?.length
    ? overview.trafficHourlyNormalized
    : TRAFFIC_FALLBACK;

  return (
    <section className="group/conception relative mt-6 overflow-hidden rounded-xl border border-orange-500/30 bg-zinc-950 text-zinc-200">
      {/* Ambient accents (sit above solid bg, never replace it) */}
      <div
        className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-gradient-to-br from-orange-600/30 via-amber-600/12 to-transparent blur-3xl animate-conception-aurora"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-20 h-[22rem] w-[22rem] rounded-full bg-gradient-to-tl from-orange-700/20 via-zinc-800/30 to-transparent blur-3xl animate-conception-aurora-slow"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/12 blur-3xl animate-conception-aurora"
        style={{ animationDelay: "-5s" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(242,116,48,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(242,116,48,0.05)_1px,transparent_1px)] bg-[size:44px_44px] opacity-90 animate-conception-grid"
        aria-hidden
      />

      <div className="relative z-10 border-b border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-4 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-500/50 bg-orange-950/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
              <BarChart2 className="h-3.5 w-3.5" aria-hidden />
              E-Commerce Intelligence
            </p>
            <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-zinc-300 sm:text-2xl">
              Analysis &amp; Recommendation System
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex animate-conception-pulse-glow items-center gap-2 rounded-full border border-orange-400/50 bg-orange-950/90 px-3 py-1.5 text-xs font-semibold text-orange-100">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-80" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-300" />
              </span>
              {overview?.hasEventData ? "Live data · auto-refresh" : "Waiting for data · auto-refresh"}
            </span>
            <div className="rounded-xl border border-orange-500/45 bg-zinc-900 px-5 py-3 text-center transition-transform duration-500 hover:scale-[1.02]">
              <p className="text-2xl font-bold tabular-nums text-orange-50">
                {overview ? new Intl.NumberFormat("en-US").format(overview.activeVisitors15m) : "—"}
              </p>
              <p className="text-[11px] font-medium text-orange-200">sessions (15 min)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className={cn(
                  conceptionNoFocusRing,
                  "rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:border-orange-400/50 hover:bg-zinc-700 hover:text-orange-100 disabled:opacity-50"
                )}
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void runAnalyze()}
                disabled={analyzeBusy}
                className={cn(
                  conceptionNoFocusRing,
                  "rounded-lg border border-orange-500/60 bg-gradient-to-r from-orange-500/95 to-amber-500/95 px-3 py-2 text-xs font-semibold text-zinc-950 hover:from-orange-400 hover:to-amber-400 disabled:opacity-50"
                )}
              >
                {analyzeBusy ? "Analyzing…" : "Run analysis"}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/45 bg-red-950/45 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        ) : null}
        {analyzeMessage ? (
          <p className="mt-2 rounded-lg border border-green-500/45 bg-green-950/45 px-3 py-2 text-xs text-green-100">
            {analyzeMessage}
          </p>
        ) : null}
        {actionMessage ? (
          <p className="mt-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
            {actionMessage}
          </p>
        ) : null}

        <nav
          className="mt-4 flex flex-wrap gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/95 p-1.5"
          aria-label="Intelligence sections"
        >
          {NAV.map((item) => {
            const isActive = activeNav === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setActiveNav(item)}
                className={cn(
                  conceptionNoFocusRing,
                  "rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-300 ease-out",
                  isActive
                    ? "scale-[1.02] bg-gradient-to-r from-orange-500 to-amber-500 text-zinc-950"
                    : "text-zinc-400 hover:bg-orange-950/50 hover:text-orange-200"
                )}
              >
                {item}
              </button>
            );
          })}
        </nav>
      </div>

      <div
        key={activeNav}
        className="relative z-10 space-y-3 bg-zinc-950 px-4 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both sm:space-y-4 sm:px-5 sm:py-4"
      >
        {activeNav === "Dashboard" && (
          <DashboardMainContent overview={overview} loading={loading} trafficSeries={trafficSeries} />
        )}
        {activeNav === "Conversion Funnel" && <ConversionFunnelContent overview={overview} />}
        {activeNav === "User Behavior" && <UserBehaviorContent />}
        {activeNav === "AI Recommendations" && (
          <AiRecommendationsContent
            recommendations={recommendations}
            overview={overview}
            onDismissRecommendation={dismissRecommendation}
            onNavigateSection={setActiveNav}
            onClearAllRecommendations={clearAllRecommendations}
          />
        )}
        {activeNav === "Alerts" && (
          <AlertsContent
            alerts={alerts}
            onDismissAlert={dismissAlert}
            onNavigateSection={setActiveNav}
          />
        )}
        {activeNav === "Security" && <SecurityContent overview={overview} />}
        {activeNav !== "Dashboard" &&
          activeNav !== "Conversion Funnel" &&
          activeNav !== "User Behavior" &&
          activeNav !== "AI Recommendations" &&
          activeNav !== "Alerts" &&
          activeNav !== "Security" && (
            <p className="rounded-lg border border-dashed border-amber-500/45 bg-amber-950/35 px-4 py-3 text-center text-sm text-amber-100">
              Preview: &quot;{activeNav}&quot; content to wire up to your data.
            </p>
          )}
      </div>
    </section>
  );
}
