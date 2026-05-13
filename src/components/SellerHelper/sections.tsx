"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Lightbulb,
  Play,
  Settings2,
  Users,
  Zap,
} from "lucide-react";
import type {
  ConceptionAlertDetailAnalysisDto,
  ConceptionAlertDto,
  ConceptionAlertRule,
  ConceptionOverviewDto,
  ConceptionRecommendationDto,
  ConceptionResolvedAlertDto,
  ConceptionUserBehaviorBrief,
} from "@/types/conception-admin";
import { sortByImportance } from "@/lib/importance-ranking";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./charts";
import { ProductPageHeatmap } from "./ProductPageHeatmap";
import type { SellerHelperNavItem } from "./nav";
import {
  sellerGhostButton,
  sellerHelperGrid,
  sellerHelperStack,
  sellerPanel,
  sellerPanelPadding,
  sellerPlaceholder,
  sellerPrimaryButton,
  sellerSecondaryButton,
  sellerSoftPanel,
  sellerSoftPanelHeading,
  sellerAccentStrip,
  sellerInsightBadge,
  sellerInsightRow,
  sellerInsightShell,
  sellerInsightTone,
} from "./layout";

function resolveImplementationSection(title: string, recommendation: string): SellerHelperNavItem {
  const text = `${title} ${recommendation}`.toLowerCase();
  if (/product|vitrina|catalog|image|color|title|price|photo|produit|vitrine|catalogue|couleur|titre|prix/.test(text)) {
    return "Vitrina Recommendation";
  }
  if (/cart|checkout|payment|conversion|funnel|form|panier|paiement|tunnel|formulaire/.test(text)) {
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

function SectionHeading({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <div className="space-y-1">
      <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-dark">
        {Icon ? <Icon className="h-5 w-5 text-orange" aria-hidden /> : null}
        {title}
      </h3>
      <p className="text-custom-sm text-dark-4">{description}</p>
    </div>
  );
}

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(sellerPanel, sellerPanelPadding, className)}>{children}</div>;
}

function heatmapBandTone(intensityPct: number) {
  if (intensityPct >= 75) return "from-red-light-4 via-red-light-3 to-red-light-2";
  if (intensityPct >= 50) return "from-yellow-light-3 via-yellow-light-2 to-yellow-light-1";
  if (intensityPct >= 25) return "from-blue-light-4 via-blue-light-3 to-blue-light-2";
  return "from-gray-2 via-gray-1 to-white";
}

function HeatmapBands({
  bands,
  productPageLabel,
}: {
  bands: ConceptionUserBehaviorBrief["heatmapBands"];
  productPageLabel: string | null;
}) {
  const axis = ["0", "0.25", "0.5", "0.75", "1"];
  if (bands.length === 0) {
    return <div className={cn(sellerPlaceholder, "mt-4")}>No scroll data available for the heatmap.</div>;
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2 sm:gap-3">
        <div className="flex min-h-[160px] w-14 flex-col justify-between py-1.5 text-[10px] leading-tight text-dark-4 sm:w-16 sm:text-xs">
          {bands.map((band) => (
            <span key={band.label} className="text-right">
              {band.label}
            </span>
          ))}
        </div>
        <div className="min-h-[160px] flex-1">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-3 bg-white">
            {bands.map((band) => (
              <div
                key={band.label}
                className={cn("flex flex-1 items-center justify-center bg-gradient-to-r", heatmapBandTone(band.intensityPct))}
              >
                <span className="sr-only">{band.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-dark-4">Intensity derived from scroll depths (7 days)</p>
          <p className="mt-1 text-center text-sm font-medium text-dark">
            {productPageLabel ?? "Most viewed product page"}
          </p>
          <div className="mt-3 flex justify-between px-1 text-[10px] tabular-nums text-dark-4 sm:text-xs">
            {axis.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionReplayModal({
  sessionId,
  durationLabel,
  device,
  status,
  onClose,
  onViewFunnel,
}: {
  sessionId: string;
  durationLabel: string;
  device: string;
  status: string;
  onClose: () => void;
  onViewFunnel?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/55 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`session-replay-${sessionId}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-gray-3 bg-white p-5 shadow-1 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h4 id={`session-replay-${sessionId}`} className="text-lg font-semibold text-dark">
          Replay session #{sessionId}
        </h4>
        <p className="mt-2 text-custom-sm text-dark-4">
          Summary computed from the session micro-events. Open admin analytics for event-by-event detail.
        </p>
        <dl className="mt-4 space-y-2 rounded-lg border border-gray-3 bg-gray-1 p-4 text-custom-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-dark-4">Duration</dt>
            <dd className="font-medium tabular-nums text-dark">{durationLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-dark-4">Device</dt>
            <dd className="font-medium text-dark">{device}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-dark-4">Status</dt>
            <dd className="font-medium text-red-dark">{status}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onViewFunnel?.()}
            className={sellerPrimaryButton}
          >
            View funnel
          </button>
          <Link href="/admin/sales-analytics" className={sellerSecondaryButton}>
            Analytics admin
          </Link>
          <button type="button" onClick={onClose} className={sellerGhostButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function UserBehaviorContent({
  behavior,
  onNavigateSection,
}: {
  behavior: ConceptionUserBehaviorBrief | null;
  onNavigateSection?: (section: SellerHelperNavItem) => void;
}) {
  const [replaySession, setReplaySession] = useState<ConceptionUserBehaviorBrief["sessionReplays"][number] | null>(
    null
  );

  const viewConversionFunnel = () => {
    setReplaySession(null);
    onNavigateSection?.("Conversion Funnel");
  };

  const journeys = behavior?.journeys ?? [];
  const scrollDepth = behavior?.scrollDepth ?? [];
  const sessionReplays = behavior?.sessionReplays ?? [];

  return (
    <div className={sellerHelperStack}>
      <SectionHeading
        title="Behavioral Analysis"
        description="Heatmaps first, then journeys, scroll depth, and session replays."
        icon={Users}
      />

      <Panel>
        <h4 className="text-base font-semibold text-dark">Product Page Heatmap</h4>
        <p className="mt-1 text-custom-sm text-dark-4">
          Select a product page and overlay hover, click, and view intensity on the live layout.
        </p>
        <ProductPageHeatmap />
      </Panel>

      <Panel>
        <h4 className="text-base font-semibold text-dark">Primary User Journeys</h4>
        <p className="mt-1 text-custom-sm text-dark-4">Most frequent navigation sequences</p>
        <div className="mt-4 flex flex-col gap-2">
          {journeys.length === 0 ?
            <div className={sellerPlaceholder}>No aggregated user journeys in the current window.</div>
          : journeys.map((journey) => {
            const converted = journey.status === "CONVERTED";
            return (
              <div
                key={journey.path}
                className={cn(
                  "flex min-h-11 items-center gap-3 overflow-hidden rounded-lg border px-3 py-2 sm:min-h-12 sm:gap-4 sm:px-4",
                  converted ?
                    cn(sellerAccentStrip.teal, "border-teal/25 bg-teal/10")
                  : cn(sellerAccentStrip.yellow, "border-yellow-light-1 bg-yellow-light-2")
                )}
              >
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    converted ?
                      "bg-teal/15 text-teal-dark"
                    : "bg-yellow-light-3 text-yellow-dark-2"
                  )}
                >
                  {journey.status}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-sm font-bold tabular-nums sm:text-base",
                    converted ? "text-teal-dark" : "text-yellow-dark-2"
                  )}
                >
                  {journey.ratePct.toFixed(1)}%
                </span>
                <span className="hidden shrink-0 text-custom-sm tabular-nums text-dark-4 sm:inline">
                  {new Intl.NumberFormat("en-US").format(journey.sessions)} session(s)
                </span>
                <span className="hidden shrink-0 text-custom-sm tabular-nums text-dark-4 md:inline">
                  {journey.durationLabel}
                </span>
                <p className="min-w-0 flex-1 truncate text-custom-sm text-dark-3">{journey.path}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className={sellerHelperGrid.two}>
        <Panel>
          <h4 className="text-base font-semibold text-dark">Scroll Depth</h4>
          <p className="mt-1 text-custom-sm text-dark-4">How far shoppers scroll on product pages</p>
          <ul className="mt-3 divide-y divide-gray-3">
            {scrollDepth.length === 0 ?
              <li className="py-4">
                <div className={sellerPlaceholder}>No scroll events recorded.</div>
              </li>
            : scrollDepth.map((item, index) => (
              <li key={item.label} className="py-2.5 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-custom-sm text-dark-3">{item.label}</span>
                  <span className="text-custom-sm font-medium tabular-nums text-orange">{item.sessionsLabel}</span>
                </div>
                {index === 0 && behavior?.scrollInsight ?
                  <div className={cn(sellerInsightRow, sellerInsightTone.attention, "mt-3")}>
                    <span className={sellerInsightBadge.attention}>Attention point</span>
                    <p className="min-w-0 flex-1 text-custom-sm text-dark-3">{behavior.scrollInsight}</p>
                  </div>
                : null}
                {index === scrollDepth.length - 1 && behavior?.scrollRecommendation ?
                  <div className={cn(sellerInsightRow, sellerInsightTone.guidance, "mt-3")}>
                    <span className={sellerInsightBadge.guidance}>Recommendation</span>
                    <p className="min-w-0 flex-1 text-custom-sm text-dark-3">{behavior.scrollRecommendation}</p>
                  </div>
                : null}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <h4 className="text-base font-semibold text-dark">Session Recordings</h4>
          <p className="mt-1 text-custom-sm text-dark-4">Replay sessions where users abandoned the cart</p>
          <div className="mt-4 space-y-3">
            {sessionReplays.length === 0 ?
              <div className={sellerPlaceholder}>No cart-abandonment sessions detected in the current window.</div>
            : sessionReplays.map((session) => (
              <div key={session.id} className="rounded-xl border border-gray-3 bg-gray-1 p-4">
                <p className="text-custom-sm font-semibold text-dark">Session #{session.id}</p>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-custom-sm">
                  <div>
                    <dt className="text-xs text-dark-4">Duration</dt>
                    <dd className="font-medium tabular-nums text-dark-3">{session.durationLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-dark-4">Device</dt>
                    <dd className="font-medium text-dark-3">{session.device}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-dark-4">Status</dt>
                    <dd className="font-medium text-red-dark">{session.status}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => setReplaySession(session)}
                  className={cn(sellerSecondaryButton, "mt-3 w-full")}
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                  View replay
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {replaySession ?
        <SessionReplayModal
          sessionId={replaySession.id}
          durationLabel={replaySession.durationLabel}
          device={replaySession.device}
          status={replaySession.status}
          onClose={() => setReplaySession(null)}
          onViewFunnel={viewConversionFunnel}
        />
      : null}
    </div>
  );
}

function aiRecPriorityStyles(tier: ConceptionRecommendationDto["priority"]) {
  if (tier === "critical") {
    return "bg-red text-white ring-1 ring-red-dark";
  }
  if (tier === "high") {
    return "bg-red-light-6 text-red-dark ring-1 ring-red-light-3";
  }
  if (tier === "medium") {
    return "bg-orange/10 text-orange-dark ring-1 ring-orange/25";
  }
  return "bg-gray-2 text-dark-4 ring-1 ring-gray-3";
}

export function AiRecommendationsContent({
  recommendations,
  overview,
  onNavigateSection,
  onDismissRecommendation,
  onClearAllRecommendations,
}: {
  recommendations: ConceptionRecommendationDto[];
  overview: ConceptionOverviewDto | null;
  onNavigateSection?: (section: SellerHelperNavItem) => void;
  onDismissRecommendation?: (id: string) => Promise<boolean>;
  onClearAllRecommendations?: () => Promise<boolean>;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [clearAllBusy, setClearAllBusy] = useState(false);

  const recs = useMemo(
    () =>
      sortByImportance(recommendations, (rec) => rec.priority).map((rec) => ({
        key: rec.id,
        priority: rec.priorityLabel,
        tier: rec.priority,
        impact: rec.impactLabel ?? "—",
        title: rec.title,
        confidence: rec.confidence,
        analyse: rec.analysis,
        recommendation: rec.recommendation,
        revenue: rec.revenueHint ?? "—",
        implementation: rec.implementationHint ?? "—",
        roi: rec.roiHint ?? "—",
      })),
    [recommendations]
  );

  const dismissRecommendation = async (key: string) => {
    setBusyKey(key);
    const dismissed = await onDismissRecommendation?.(key);
    if (dismissed && expandedKey === key) setExpandedKey(null);
    setBusyKey(null);
  };

  const summary = [
    { label: "Active recommendations", value: String(recommendations.length) },
    {
      label: "Events (7d)",
      value: overview ? new Intl.NumberFormat("en-US").format(overview.totalEvents7d) : "—",
    },
    {
      label: "Average confidence",
      value:
        recommendations.length > 0 ?
          `${Math.round(recommendations.reduce((sum, item) => sum + item.confidence, 0) / recommendations.length)}%`
        : "—",
    },
  ];

  return (
    <div className={sellerHelperStack}>
      <SectionHeading
        title="AI Recommendations"
        description="Saved recommendations from the last LLM analysis (OpenRouter / Gemini), grounded in live telemetry and your product catalogue from the database. Run Analyze now to refresh."
        icon={Lightbulb}
      />
      {recommendations.length > 0 && onClearAllRecommendations ?
        <div className="flex flex-wrap justify-end gap-2">
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
            className={sellerGhostButton}
          >
            {clearAllBusy ? "Erasing…" : "Erase all recommendations"}
          </button>
        </div>
      : null}
      {recommendations.length === 0 ?
        <p className="rounded-lg border border-orange/20 bg-orange/10 px-4 py-3 text-custom-sm text-orange-dark">
          No recommendations yet. Click <strong>Analyze now</strong> above: the model reads your micro-events and
          catalogue from the database and writes new cards here (requires API keys in production).
        </p>
      : null}

      <div className={sellerHelperGrid.three}>
        {summary.map((item) => (
          <Panel key={item.label}>
            <p className="text-custom-sm text-dark-4">{item.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-dark">{item.value}</p>
          </Panel>
        ))}
      </div>

      <div className="space-y-4">
        {recs.length === 0 ?
          <div className="rounded-lg border border-dashed border-gray-4 bg-gray-1 px-4 py-6 text-center text-custom-sm text-dark-4">
            No active recommendations right now.
          </div>
        : recs.map((rec) => (
          <Panel key={rec.key}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <span
                className={cn(
                  "inline-flex w-fit rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                  aiRecPriorityStyles(rec.tier)
                )}
              >
                {rec.priority}
              </span>
              <p className="text-custom-sm text-dark-4">
                Estimated impact: <span className="font-semibold text-orange">{rec.impact}</span>
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-3 border-t border-gray-3 pt-3 sm:flex-row sm:items-start sm:justify-between">
              <h4 className="text-base font-semibold leading-snug text-dark sm:max-w-[65%]">{rec.title}</h4>
              <div className="shrink-0 sm:text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-dark-4">AI confidence</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-dark">{rec.confidence}%</p>
                <ProgressBar value={rec.confidence} className="mt-2 sm:ml-auto sm:w-28" />
              </div>
            </div>

            <div className={cn(sellerInsightRow, sellerInsightTone.info, "mt-3")}>
              <span className={sellerInsightBadge.info}>Analysis</span>
              <p className="min-w-0 flex-1 text-custom-sm leading-relaxed text-dark-3">{rec.analyse}</p>
            </div>

            <div className={cn(sellerInsightRow, sellerInsightTone.guidance, "mt-3")}>
              <span className={sellerInsightBadge.guidance}>Recommendation</span>
              <p className="min-w-0 flex-1 text-custom-sm leading-relaxed text-dark-3">{rec.recommendation}</p>
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-3 border-t border-gray-3 pt-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-dark-4">Estimated revenue</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-dark">{rec.revenue}</dd>
              </div>
              <div>
                <dt className="text-xs text-dark-4">Implementation time</dt>
                <dd className="mt-1 text-lg font-semibold text-dark-3">{rec.implementation}</dd>
              </div>
              <div>
                <dt className="text-xs text-dark-4">Estimated ROI</dt>
                <dd className="mt-1 text-lg font-semibold text-orange">{rec.roi}</dd>
              </div>
            </dl>

            {expandedKey === rec.key ?
              <div className="mt-3 rounded-lg border border-gray-3 bg-gray-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-dark-4">Full details</p>
                <p className="mt-2 text-custom-sm leading-relaxed text-dark-3">{rec.analyse}</p>
                <p className="mt-3 text-custom-sm leading-relaxed text-dark-3">{rec.recommendation}</p>
              </div>
            : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyKey === rec.key}
                onClick={() => onNavigateSection?.(resolveImplementationSection(rec.title, rec.recommendation))}
                className={sellerPrimaryButton}
              >
                Implement this recommendation
              </button>
              <button
                type="button"
                onClick={() => setExpandedKey((current) => (current === rec.key ? null : rec.key))}
                className={sellerSecondaryButton}
              >
                {expandedKey === rec.key ? "Hide details" : "More details"}
              </button>
              <button
                type="button"
                disabled={busyKey === rec.key}
                onClick={() => void dismissRecommendation(rec.key)}
                className={sellerGhostButton}
              >
                Dismiss
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function AlertSummaryIconBadge({ kind }: { kind: "alert" | "clock" | "check" | "zap" }) {
  const base = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange/10 sm:h-11 sm:w-11";
  if (kind === "alert") {
    return (
      <div className={base} aria-hidden>
        <AlertTriangle className="h-5 w-5 text-red" />
      </div>
    );
  }
  if (kind === "clock") {
    return (
      <div className={base} aria-hidden>
        <Clock className="h-5 w-5 text-orange" />
      </div>
    );
  }
  if (kind === "check") {
    return (
      <div className={base} aria-hidden>
        <CheckCircle2 className="h-5 w-5 text-teal" />
      </div>
    );
  }
  return (
    <div className={base} aria-hidden>
      <Zap className="h-5 w-5 text-orange" />
    </div>
  );
}

function alertSeverityPill(tier: ConceptionAlertDto["severity"]) {
  if (tier === "critical") return "bg-red text-white";
  if (tier === "high") return "bg-orange text-white";
  if (tier === "medium") return "bg-orange/15 text-dark";
  return "bg-gray-5 text-white";
}

function alertIncidentCardSurface(tier: ConceptionAlertDto["severity"]) {
  if (tier === "critical") return "border-l-4 border-l-red bg-red-light-6";
  if (tier === "high") return "border-l-4 border-l-orange bg-orange/10";
  if (tier === "medium") return "border-l-4 border-l-orange/50 bg-orange/10";
  return "border-l-4 border-l-gray-4 bg-gray-1";
}

function alertDtoToIncident(alert: ConceptionAlertDto) {
  const severity =
    alert.severity === "critical" ? "CRITICAL"
    : alert.severity === "high" ? "HIGH"
    : alert.severity === "medium" ? "MEDIUM"
    : "LOW";
  return {
    key: alert.id,
    severity,
    tier: alert.severity,
    title: alert.title,
    status: "ACTIVE",
    statusKind: "active" as const,
    description: alert.description,
    detail: alert.detail ?? "",
    timeAgo: new Date(alert.createdAt).toLocaleString("en-US"),
    affected:
      alert.affectedSessionsEstimate != null ?
        `${new Intl.NumberFormat("en-US").format(alert.affectedSessionsEstimate)} session(s)`
      : "—",
  };
}

function deviationToneClass(tone: ConceptionAlertDetailAnalysisDto["deviations"][number]["tone"]) {
  if (tone === "critical") return "border-red-light-3 bg-red-light-6 text-red-dark";
  if (tone === "high") return "border-orange/25 bg-orange/10 text-orange-dark";
  if (tone === "medium") return "border-yellow-light-1 bg-yellow-light-4 text-yellow-dark-2";
  return "border-gray-3 bg-gray-1 text-dark-4";
}

function AlertDetailModal({
  alert,
  analysis,
  loading,
  error,
  onClose,
  onViewFunnel,
}: {
  alert: ConceptionAlertDto;
  analysis: ConceptionAlertDetailAnalysisDto | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onViewFunnel?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/55 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`alert-detail-${alert.id}`}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-gray-3 bg-white p-5 shadow-1 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-dark">Detailed analysis</p>
            <h4 id={`alert-detail-${alert.id}`} className="text-lg font-semibold text-dark">
              {alert.title}
            </h4>
            <p className="text-custom-sm text-dark-4">{alert.alertType}</p>
          </div>
          <button type="button" onClick={onClose} className={sellerGhostButton}>
            Close
          </button>
        </div>

        {loading ?
          <div className={cn(sellerPlaceholder, "mt-5")}>Analyzing signals…</div>
        : error ?
          <p className="mt-5 rounded-lg border border-red-light-3 bg-red-light-6 px-4 py-3 text-custom-sm text-red-dark">
            {error}
          </p>
        : analysis ?
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-orange/20 bg-orange/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-dark">Summary</p>
              <p className="mt-2 text-custom-sm leading-relaxed text-dark-3">{analysis.summary}</p>
            </div>

            {analysis.indicators.length > 0 ?
              <div>
                <h5 className="text-sm font-semibold text-dark">Key figures</h5>
                <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {analysis.indicators.map((indicator) => (
                    <div key={indicator.label} className="rounded-lg border border-gray-3 bg-gray-1 p-3">
                      <dt className="text-xs text-dark-4">{indicator.label}</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums text-dark">{indicator.value}</dd>
                      {indicator.note ?
                        <p className="mt-1 text-xs text-dark-4">{indicator.note}</p>
                      : null}
                    </div>
                  ))}
                </dl>
              </div>
            : null}

            {analysis.deviations.length > 0 ?
              <div>
                <h5 className="text-sm font-semibold text-dark">Deviations vs baseline</h5>
                <ul className="mt-3 space-y-2">
                  {analysis.deviations.map((deviation) => (
                    <li
                      key={deviation.label}
                      className={cn("rounded-lg border px-3 py-2.5", deviationToneClass(deviation.tone))}
                    >
                      <p className="text-custom-sm font-medium">{deviation.label}</p>
                      <p className="mt-1 text-custom-sm">
                        Observed: <span className="font-semibold tabular-nums">{deviation.value}</span>
                        <span className="mx-2 text-dark-4">•</span>
                        Baseline: <span className="font-medium tabular-nums">{deviation.baseline}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            : null}

            {analysis.clues.length > 0 ?
              <div>
                <h5 className="text-sm font-semibold text-dark">Clues</h5>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-custom-sm text-dark-3">
                  {analysis.clues.map((clue) => (
                    <li key={clue}>{clue}</li>
                  ))}
                </ul>
              </div>
            : null}

            {analysis.fixSteps.length > 0 ?
              <div>
                <h5 className="text-sm font-semibold text-dark">Recommended fixes</h5>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-custom-sm text-dark-3">
                  {analysis.fixSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            : null}
          </div>
        : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onViewFunnel?.()}
            className={sellerPrimaryButton}
          >
            View funnel
          </button>
          <Link href="/admin/sales-analytics" className={sellerSecondaryButton}>
            Analytics admin
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatResolvedDuration(createdAt: string, dismissedAt: string) {
  const durationMs = new Date(dismissedAt).getTime() - new Date(createdAt).getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) return "Unknown duration";
  const minutes = Math.round(durationMs / 60_000);
  if (minutes < 60) return `Duration: ${minutes} minute(s)`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `Duration: ${hours}h ${remainder}min`;
}

export function AlertsContent({
  alerts,
  resolvedAlerts,
  alertRules,
  onNavigateSection,
  onDismissAlert,
}: {
  alerts: ConceptionAlertDto[];
  resolvedAlerts: ConceptionResolvedAlertDto[];
  alertRules: ConceptionAlertRule[];
  onNavigateSection?: (section: SellerHelperNavItem) => void;
  onDismissAlert?: (id: string, disposition: "resolved" | "ignored") => Promise<boolean>;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [detailAlert, setDetailAlert] = useState<ConceptionAlertDto | null>(null);
  const [detailAnalysis, setDetailAnalysis] = useState<ConceptionAlertDetailAnalysisDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const incidents = useMemo(
    () => sortByImportance(alerts, (alert) => alert.severity).map((alert) => alertDtoToIncident(alert)),
    [alerts]
  );

  const dismissIncident = async (key: string, disposition: "resolved" | "ignored") => {
    setBusyKey(key);
    await onDismissAlert?.(key, disposition);
    setBusyKey(null);
  };

  const closeDetail = () => {
    setDetailAlert(null);
    setDetailAnalysis(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const viewConversionFunnel = () => {
    closeDetail();
    onNavigateSection?.("Conversion Funnel");
  };

  const analyzeIncident = async (alertId: string) => {
    const alert = alerts.find((item) => item.id === alertId);
    if (!alert) return;

    setDetailAlert(alert);
    setDetailAnalysis(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const response = await fetch("/api/admin/conception/alerts/detail", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alertId }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || body.error || "Analysis unavailable.");
      }
      setDetailAnalysis(body.analysis as ConceptionAlertDetailAnalysisDto);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : String(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const criticalCount = alerts.filter((alert) => alert.severity === "critical").length;
  const highCount = alerts.filter((alert) => alert.severity === "high").length;
  const resolved24h = resolvedAlerts.filter(
    (alert) => Date.now() - new Date(alert.dismissedAt).getTime() <= 24 * 60 * 60 * 1000
  ).length;

  const summary = [
    {
      label: "Active Alerts",
      value: String(alerts.length),
      icon: "alert" as const,
      sub:
        criticalCount > 0 ?
          { text: `${criticalCount} critical`, className: "font-medium text-red-dark" }
        : highCount > 0 ?
          { text: `${highCount} high`, className: "font-medium text-orange-dark" }
        : { text: "Conception engine", className: "text-dark-4" },
      tag: null,
    },
    {
      label: "Under Investigation",
      value: String(alerts.filter((alert) => alert.severity === "medium").length),
      icon: "clock" as const,
      sub: { text: "Medium priority", className: "text-dark-4" },
      tag: null,
    },
    {
      label: "Resolved (24h)",
      value: String(resolved24h),
      icon: "check" as const,
      sub: { text: `${resolvedAlerts.length} total`, className: "text-dark-4" },
      tag: null,
    },
    {
      label: "Active rules",
      value: String(alertRules.length),
      icon: "zap" as const,
      sub: null,
      tag: "Engine",
    },
  ];

  return (
    <div className={sellerHelperStack}>
      <SectionHeading
        title="Alerts"
        description="Incidents and signals that need attention"
        icon={Bell}
      />
      {alerts.length === 0 ?
        <p className="rounded-lg border border-orange/20 bg-orange/10 px-4 py-3 text-custom-sm text-orange-dark">
          Run analysis to detect incidents from collected micro-events.
        </p>
      : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((row) => (
          <div key={row.label} className={cn(sellerPanel, sellerPanelPadding, "flex gap-3")}>
            <AlertSummaryIconBadge kind={row.icon} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium leading-tight text-dark-4 sm:text-xs">{row.label}</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-dark sm:text-2xl">{row.value}</p>
              {row.sub ? <p className={cn("mt-1 text-xs leading-snug", row.sub.className)}>{row.sub.text}</p> : null}
              {row.tag ? (
                <span className="mt-1.5 inline-block rounded-md bg-gray-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dark-4">
                  {row.tag}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <Panel>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange/10 text-orange">
            <Bell className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h4 className="text-base font-semibold text-dark">Active Alerts</h4>
            <p className="text-custom-sm text-dark-4">Ongoing incidents that need attention</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {incidents.length === 0 ?
            <div className="rounded-lg border border-dashed border-gray-4 bg-gray-1 px-4 py-6 text-center text-custom-sm text-dark-4">
              No active alerts right now.
            </div>
          : incidents.map((incident) => {
            const activeStatus = incident.statusKind === "active";
            return (
              <article
                key={incident.key}
                className={cn("overflow-hidden rounded-lg border border-gray-3 p-4", alertIncidentCardSurface(incident.tier))}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-[11px]",
                      alertSeverityPill(incident.tier)
                    )}
                  >
                    {incident.severity}
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-[11px]",
                      activeStatus ?
                        "border border-red bg-white text-red-dark"
                      : "border border-gray-4 bg-white text-dark-4"
                    )}
                  >
                    {incident.status}
                  </span>
                </div>
                <h5 className="mt-2 text-base font-semibold text-dark">{incident.title}</h5>
                <p className="mt-1 text-custom-sm text-dark-3">{incident.description}</p>
                <p className="mt-1 text-custom-sm text-dark-4">{incident.detail}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-4">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {incident.timeAgo}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {incident.affected}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={detailLoading && detailAlert?.id === incident.key}
                    onClick={() => void analyzeIncident(incident.key)}
                    className={sellerPrimaryButton}
                  >
                    {detailLoading && detailAlert?.id === incident.key ? "Analyzing…" : "Analyze in detail"}
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === incident.key}
                    onClick={() => void dismissIncident(incident.key, "resolved")}
                    className={sellerSecondaryButton}
                  >
                    Mark as resolved
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === incident.key}
                    onClick={() => void dismissIncident(incident.key, "ignored")}
                    className={sellerGhostButton}
                  >
                    Dismiss temporarily
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      <div className={sellerHelperGrid.two}>
        <Panel>
          <h4 className="inline-flex items-center gap-2 text-base font-semibold text-dark">
            <CheckCircle2 className="h-4 w-4 text-teal" aria-hidden />
            Resolved Alerts
          </h4>
          <p className="mt-1 text-custom-sm text-dark-4">Recent history</p>
          <ul className="mt-3 space-y-3">
            {resolvedAlerts.length === 0 ?
              <li className="py-4">
                <div className={sellerPlaceholder}>No archived alerts yet.</div>
              </li>
            : resolvedAlerts.map((resolved) => (
              <li key={resolved.id} className="border-b border-gray-3 pb-3 last:border-0 last:pb-0">
                <p className="text-custom-sm font-medium text-dark">{resolved.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-dark-4">
                  <span>{resolved.alertType}</span>
                  <span aria-hidden>•</span>
                  <span>{new Date(resolved.dismissedAt).toLocaleString("en-US")}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-dark-4">
                  {formatResolvedDuration(resolved.createdAt, resolved.dismissedAt)}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-dark-3">{resolved.detail ?? resolved.description}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <h4 className="inline-flex items-center gap-2 text-base font-semibold text-dark">
            <Settings2 className="h-4 w-4 text-orange" aria-hidden />
            Alert Rules
          </h4>
          <p className="mt-1 text-custom-sm text-dark-4">Trigger configuration</p>
          <ul className="mt-3 divide-y divide-gray-3">
            {alertRules.length === 0 ?
              <li className="py-4">
                <div className={sellerPlaceholder}>No rules configured.</div>
              </li>
            : alertRules.map((rule) => (
              <li key={rule.name} className="flex flex-col gap-0.5 py-2 first:pt-0">
                <span className="text-custom-sm font-medium text-dark">{rule.name}</span>
                <span className="text-xs text-dark-4 sm:text-custom-sm">{rule.condition}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {detailAlert ?
        <AlertDetailModal
          alert={detailAlert}
          analysis={detailAnalysis}
          loading={detailLoading}
          error={detailError}
          onClose={closeDetail}
          onViewFunnel={viewConversionFunnel}
        />
      : null}
    </div>
  );
}
