"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BarChart2, Compass, Store, Users, Zap } from "lucide-react";
import {
  useConceptionAdminData,
  type ConceptionAdminInitialData,
} from "@/hooks/useConceptionAdminData";
import { sortByImportance } from "@/lib/importance-ranking";
import type { ConceptionOverviewDto } from "@/types/conception-admin";
import { cn } from "@/lib/utils";
import { ProgressBar, TrafficChart } from "./charts";
import { AiRecommendationsContent, AlertsContent, UserBehaviorContent } from "./sections";
import { VitrinaRecommendationsContent } from "./vitrina-recommendations";
import { SecurityTabContent } from "./security-tab";
import { SELLER_HELPER_NAV, SELLER_HELPER_NAV_META, type SellerHelperNavItem } from "./nav";
import {
  sellerAccentStrip,
  sellerBadge,
  sellerHelperGrid,
  sellerHero,
  sellerHeroInner,
  sellerNav,
  sellerNavButton,
  sellerPanel,
  sellerPanelPadding,
  sellerPlaceholder,
  sellerPrimaryButton,
  sellerSecondaryButton,
  sellerHelperStack,
  sellerInsightBadge,
  sellerInsightRow,
  sellerInsightShell,
  sellerInsightTone,
  sellerTable,
  sellerTableHead,
  sellerTableRow,
  sellerTableWrap,
} from "./layout";

const NAV = SELLER_HELPER_NAV;

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
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: (typeof sellerAccentStrip)[keyof typeof sellerAccentStrip];
}) {
  return <div className={cn(sellerPanel, accent, sellerPanelPadding, className)}>{children}</div>;
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
  if (loading && !overview) {
    return <div className={sellerPlaceholder}>Loading metrics…</div>;
  }

  const kpis = overview?.kpis ?? [];
  const devices = overview?.devices ?? [];
  const topPages = (overview?.topPages ?? []).map((row) => ({
    page: row.page,
    views: new Intl.NumberFormat("en-US").format(row.views),
    conversions: new Intl.NumberFormat("en-US").format(row.conversions),
    rate: `${row.ratePct.toFixed(2)}%`,
  }));

  return (
    <div className={sellerHelperStack}>
      <div className={sellerHelperGrid.four}>
        {kpis.length === 0 ?
          <div className={cn(sellerPlaceholder, "col-span-full")}>No metrics available yet.</div>
        : kpis.map((kpi) => (
          <Panel key={kpi.label} accent={sellerAccentStrip.orange}>
            <p className="text-custom-sm text-dark-4">{kpi.label}</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-dark">{kpi.value}</p>
            <p
              className={cn(
                "mt-1.5 text-xs font-medium",
                kpi.deltaPositive ? "text-teal-dark" : "text-red-dark"
              )}
            >
              {kpi.delta}
              <span className="ml-1 font-normal text-dark-4">vs previous period</span>
            </p>
          </Panel>
        ))}
      </div>

      <div className={sellerHelperGrid.two}>
        <Panel>
          <SectionHeading
            title="Traffic & Sales (24h)"
            description="Collected event volume (normalized)"
            icon={BarChart2}
          />
          <div className="mt-4 -mx-1">
            <TrafficChart series={trafficSeries} />
          </div>
        </Panel>

        <Panel>
          <SectionHeading
            title="Devices"
            description="Recorded browser context distribution"
            icon={Users}
          />
          <div className="mt-4 space-y-4">
            {devices.length === 0 ?
              <div className={sellerPlaceholder}>No device breakdown recorded.</div>
            : devices.map((device) => (
              <div key={device.name}>
                <div className="mb-1.5 flex items-center justify-between text-custom-sm">
                  <span className="font-medium text-dark">{device.name}</span>
                  <span className="tabular-nums text-dark-4">{device.pct}%</span>
                </div>
                <ProgressBar value={device.pct} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionHeading
          title="Top Performing Pages"
          description="Micro-event views and buy clicks by path"
          icon={BarChart2}
        />
        <div className={cn(sellerTableWrap, "mt-4")}>
          <table className={sellerTable}>
            <thead>
              <tr className={sellerTableHead}>
                <th className="pb-3 pr-3 font-medium">Page</th>
                <th className="pb-3 pr-3 font-medium">Views</th>
                <th className="pb-3 pr-3 font-medium">Conversions</th>
                <th className="pb-3 font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {topPages.length === 0 ?
                <tr>
                  <td colSpan={4} className="py-6 text-center text-custom-sm text-dark-4">
                    No pages with recorded traffic in the current window.
                  </td>
                </tr>
              : topPages.map((row) => (
                <tr key={row.page} className={sellerTableRow}>
                  <td className="py-3 pr-3 font-mono text-xs text-dark sm:text-custom-sm">{row.page}</td>
                  <td className="py-3 pr-3 tabular-nums">{row.views}</td>
                  <td className="py-3 pr-3 tabular-nums">{row.conversions}</td>
                  <td className="py-3 tabular-nums font-medium text-orange">{row.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-right text-xs text-dark-4">
          {overview?.computedAt ? new Date(overview.computedAt).toLocaleString("en-US") : "—"}
        </p>
      </Panel>
    </div>
  );
}

function ConversionFunnelContent({ overview }: { overview: ConceptionOverviewDto | null }) {
  const steps = (overview?.funnelSteps ?? []).map((step) => ({
    title: step.title,
    countLabel: step.countLabel,
    fromPrevLabel: step.fromPrevLabel,
    overallLabel: step.overallLabel,
    abandonLabel: step.abandonLabel,
    barPct: step.barPct,
  }));
  const summary = overview?.funnelSummary ?? [];
  const friction = sortByImportance(overview?.frictionItems ?? [], (item) => item.priority).map((item) => ({
    priority: item.priority,
    title: item.title,
    body: item.body,
    reco: item.reco,
  }));

  return (
    <div className={sellerHelperStack}>
      <Panel>
        <SectionHeading
          title="Conversion Funnel"
          description="Product → cart → checkout → payment journey"
          icon={BarChart2}
        />
        <div className="mt-4 space-y-4">
          {steps.length ?
            steps.map((step, index) => (
            <div key={step.title}>
              <div className="space-y-2">
                <p className="font-medium text-dark">{step.title}</p>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-custom-sm">
                  <span className="text-xl font-bold tabular-nums text-dark">{step.countLabel}</span>
                  <span className="text-dark-4">{step.fromPrevLabel}</span>
                  <span className="font-semibold tabular-nums text-orange">{step.overallLabel}</span>
                  {step.abandonLabel ? (
                    <span className="font-medium text-red">{step.abandonLabel}</span>
                  ) : null}
                </div>
                <ProgressBar value={step.barPct} />
              </div>
              {index < steps.length - 1 ? <div className="my-3 h-px bg-gray-3" aria-hidden /> : null}
            </div>
            ))
          : <div className={sellerPlaceholder}>No funnel steps recorded yet.</div>}
        </div>
      </Panel>

      {summary.length ? (
        <div className={sellerHelperGrid.three}>
          {summary.map((item) => (
            <Panel key={item.label}>
              <p className="text-custom-sm text-dark-4">{item.label}</p>
              <p className="mt-1.5 text-xl font-semibold tabular-nums text-dark">{item.value}</p>
              <p
                className={cn(
                  "mt-2 text-xs font-medium",
                  item.subTone === "emerald" && "text-teal-dark",
                  item.subTone === "amber" && "text-yellow-dark",
                  item.subTone === "rose" && "text-red-dark"
                )}
              >
                {item.sub}
              </p>
            </Panel>
          ))}
        </div>
      ) : null}

      {friction.length ? (
        <Panel>
          <SectionHeading
            title="Detected Friction Points"
            description="Analytical rules on the conversion funnel"
            icon={AlertTriangle}
          />
          <div className="mt-4 space-y-3">
            {friction.map((item) => (
              <div key={item.title} className={cn(sellerInsightShell, sellerInsightTone.risk)}>
                <p className={cn(sellerInsightBadge.risk, "w-fit")}>{item.priority}</p>
                <p className="mt-2 text-base font-semibold text-dark">{item.title}</p>
                <p className="mt-2 text-custom-sm text-dark-4">{item.body}</p>
                <div className={cn(sellerInsightRow, sellerInsightTone.info, "mt-3")}>
                  <span className={sellerInsightBadge.info}>Recommendation</span>
                  <p className="min-w-0 flex-1 text-custom-sm text-dark-3">{item.reco}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

type SellerHelperDashboardProps = {
  initialData?: ConceptionAdminInitialData;
  initialError?: string | null;
};

export default function SellerHelperDashboard({
  initialData,
  initialError = null,
}: SellerHelperDashboardProps) {
  const [activeNav, setActiveNav] = useState<SellerHelperNavItem>("Dashboard");
  const {
    overview,
    alerts,
    resolvedAlerts,
    recommendations,
    vitrinaRecommendations,
    loading,
    error,
    refresh,
    runAnalyze,
    analyzeBusy,
    analyzeMessage,
    actionMessage,
    dismissAlert,
    dismissRecommendation,
  } = useConceptionAdminData(initialData, initialError);

  const trafficSeries = overview?.trafficHourlyNormalized ?? [];

  const handleNavigateSection = useCallback((section: SellerHelperNavItem) => {
    setActiveNav(section);
  }, []);

  return (
    <div className={sellerHelperStack}>
      <div className={sellerHero}>
        <div className={sellerHeroInner}>
          <div className="max-w-3xl space-y-2">
            <p className="inline-flex items-center gap-2 text-custom-sm font-medium text-orange">
              <Store className="h-4 w-4" aria-hidden />
              Seller Helper
            </p>
            <h2 className="text-2xl font-semibold text-dark sm:text-custom-2">Your store dashboard</h2>
            <p className="max-w-2xl text-custom-sm text-dark-4">
              Start with overview and behavior, then work through funnel, merchandising, and alerts.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className={overview?.hasEventData ? sellerBadge.live : sellerBadge.muted}>
                <span className="relative flex h-2 w-2">
                  {overview?.hasEventData ? (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange opacity-60" />
                  ) : null}
                  <span
                    className={cn(
                      "relative inline-flex h-2 w-2 rounded-full",
                      overview?.hasEventData ? "bg-orange" : "bg-gray-5"
                    )}
                  />
                </span>
                {overview?.hasEventData ? "Live data · auto-refresh" : "Waiting for data · auto-refresh"}
              </span>
              <span className={sellerBadge.accent}>
                <Zap className="h-3.5 w-3.5 shrink-0 text-orange" aria-hidden />
                {overview ?
                  `${new Intl.NumberFormat("en-US").format(overview.activeVisitors15m)} sessions / 15 min`
                : "Sessions 15 min"}
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <Link href="/admin" className={sellerSecondaryButton}>
              <Compass className="h-4 w-4" aria-hidden />
              Open admin
            </Link>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void refresh()} disabled={loading} className={sellerSecondaryButton}>
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void runAnalyze()}
                disabled={analyzeBusy}
                className={sellerPrimaryButton}
              >
                {analyzeBusy ? "Analyzing…" : "Run analysis"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-light-3 bg-red-light-6 px-4 py-3 text-custom-sm text-red-dark">
          {error}
        </p>
      ) : null}
      {analyzeMessage ? (
        <p className="rounded-lg border border-green-light-3 bg-green-light-6 px-4 py-3 text-custom-sm text-green-dark">
          {analyzeMessage}
        </p>
      ) : null}
      {actionMessage ? (
        <p className="rounded-lg border border-gray-3 bg-gray-1 px-4 py-3 text-custom-sm text-dark-3">
          {actionMessage}
        </p>
      ) : null}

      <nav className={sellerNav} aria-label="Seller Helper sections">
        {NAV.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handleNavigateSection(item)}
            className={sellerNavButton(activeNav === item)}
            aria-current={activeNav === item ? "page" : undefined}
          >
            {SELLER_HELPER_NAV_META[item].label}
          </button>
        ))}
      </nav>

      <div className="rounded-lg border border-gray-3 bg-gray-1 px-4 py-3">
        <p className="text-sm font-semibold text-dark">{activeNav}</p>
        <p className="mt-1 text-xs text-dark-4">{SELLER_HELPER_NAV_META[activeNav].description}</p>
      </div>

      <div id="seller-helper-active-section">
        {activeNav === "Dashboard" && (
          <DashboardMainContent overview={overview} loading={loading} trafficSeries={trafficSeries} />
        )}
        {activeNav === "User Behavior" && (
          <UserBehaviorContent
            behavior={overview?.userBehavior ?? null}
            onNavigateSection={handleNavigateSection}
          />
        )}
        {activeNav === "Conversion Funnel" && <ConversionFunnelContent overview={overview} />}
        {activeNav === "Vitrina Recommendation" && (
          <VitrinaRecommendationsContent recommendations={vitrinaRecommendations} />
        )}
        {activeNav === "AI Recommendations" && (
          <AiRecommendationsContent
            recommendations={recommendations}
            overview={overview}
            onNavigateSection={handleNavigateSection}
            onDismissRecommendation={dismissRecommendation}
          />
        )}
        {activeNav === "Alerts" && (
          <AlertsContent
            alerts={alerts}
            resolvedAlerts={resolvedAlerts}
            alertRules={overview?.alertRules ?? []}
            onNavigateSection={handleNavigateSection}
            onDismissAlert={dismissAlert}
          />
        )}
        {activeNav === "Security" && <SecurityTabContent overview={overview} />}
      </div>
    </div>
  );
}
