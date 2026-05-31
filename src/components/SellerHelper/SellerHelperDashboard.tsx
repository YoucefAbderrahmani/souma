"use client";

import React, { memo, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertTriangle, BarChart2, Settings, Users } from "lucide-react";
import { SellerHelperLogo } from "./SellerHelperLogo";
import {
  useConceptionAdminData,
  type ConceptionAdminInitialData,
} from "@/hooks/useConceptionAdminData";
import { sortByImportance } from "@/lib/importance-ranking";
import type { ConceptionOverviewDto } from "@/types/conception-admin";
import { cn } from "@/lib/utils";
import { ProgressBar, TrafficChart } from "./charts";
import { UserBehaviorContent } from "./sections";
import { VitrinaRecommendationsContent } from "./vitrina-recommendations";
import { SecurityTabContent } from "./security-tab";
import { SellerHelperNav } from "./SellerHelperNav";
import { SellerHelperInsightCard } from "./SellerHelperInsightCard";
import { priorityFromLabel } from "./ai-recommendation-card-utils";
import type { SellerHelperNavItem } from "./nav";
import { useInstantTab } from "@/hooks/useInstantTab";
import { InstantPanel } from "@/components/ui/InstantPanel";
import {
  sellerAccentStrip,
  sellerHelperGrid,
  sellerHero,
  sellerHeroInner,
  sellerHeroMetric,
  sellerHeroMetricHint,
  sellerHeroMetricTitle,
  sellerPanel,
  sellerPanelPadding,
  sellerPlaceholder,
  sellerPrimaryButton,
  sellerSecondaryButton,
  sellerHelperStack,
  sellerTable,
  sellerTableHead,
  sellerTableRow,
  sellerTableWrap,
} from "./layout";

function SectionLoading({ label }: { label: string }) {
  return <div className={sellerPlaceholder}>Loading {label}…</div>;
}

function formatSessions15m(count: number) {
  const label = count === 1 ? "session" : "sessions";
  return `${new Intl.NumberFormat("en-US").format(count)} ${label}`;
}

const AiRecommendationsContent = dynamic(
  () => import("./sections").then((m) => m.AiRecommendationsContent),
  { loading: () => <SectionLoading label="AI recommendations" /> }
);

const AlertsContent = dynamic(
  () => import("./sections").then((m) => m.AlertsContent),
  { loading: () => <SectionLoading label="alerts" /> }
);

const InboxContent = dynamic(
  () => import("./inbox-tab").then((m) => m.InboxContent),
  { loading: () => <SectionLoading label="inbox" /> }
);

const TimelineContent = dynamic(
  () => import("./timeline-tab").then((m) => m.TimelineContent),
  { loading: () => <SectionLoading label="timeline" /> }
);

function SectionHeading({
  title,
  icon: Icon,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-dark">
      {Icon ? <Icon className="h-5 w-5 text-orange" aria-hidden /> : null}
      {title}
    </h3>
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
          <SectionHeading title="Traffic & Sales (24h)" icon={BarChart2} />
          <div className="mt-4 -mx-1">
            <TrafficChart series={trafficSeries} />
          </div>
        </Panel>

        <Panel>
          <SectionHeading title="Devices" icon={Users} />
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
  const liveHours = overview?.funnelLiveHours ?? 6;
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
          icon={BarChart2}
        />
        <p className="mt-2 text-custom-sm text-dark-4">
          Page-visit counts for the last {liveHours} hours — each time you land on the product, cart,
          or checkout page the matching step increases (any navigation path). &quot;Order completed&quot;
          counts successful payments (
          <code className="rounded bg-gray-1 px-1">?payment=success</code>).
        </p>
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
            icon={AlertTriangle}
          />
          <div className="flex flex-col gap-3">
            {friction.map((item, index) => (
              <SellerHelperInsightCard
                key={item.title}
                layout="unified"
                tier={priorityFromLabel(item.priority)}
                priorityLabel={item.priority}
                title={item.title}
                body={item.body}
                recommendation={item.reco}
                animationIndex={index}
              />
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
  /** Embedded in admin panel vs standalone /seller-helper page */
  variant?: "default" | "admin";
};

function SellerHelperDashboardInner({
  initialData,
  initialError = null,
  variant = "default",
}: SellerHelperDashboardProps) {
  const isAdminEmbed = variant === "admin";
  const { active: activeNav, visited: visitedSections, select: selectNav } =
    useInstantTab<SellerHelperNavItem>("Dashboard");
  const [visualNav, setVisualNav] = useState<SellerHelperNavItem>("Dashboard");

  useEffect(() => {
    setVisualNav(activeNav);
  }, [activeNav]);
  const {
    overview,
    alerts,
    resolvedAlerts,
    recommendations,
    inbox,
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
    sendRecommendationEmail,
    markInboxImplemented,
    dismissInboxItem,
    clearAllRecommendations,
    clearAllAlerts,
    clearAllSecurity,
    dismissVitrinaAfterQuickFix,
    clearAllVitrinaRecommendations,
    clearVitrinaProductData,
    resetAllVitrinaCatalogToDefault,
    vitrinaFixesPerItem,
    vitrinaReloadBusy,
    setVitrinaFixesPerItem,
  } = useConceptionAdminData(initialData, initialError, {
    liveRefreshIntervalMs: isAdminEmbed ? 60_000 : 5_000,
  });

  const trafficSeries = overview?.trafficHourlyNormalized ?? [];

  const handleNavigateSection = useCallback(
    (section: SellerHelperNavItem) => {
      setVisualNav(section);
      selectNav(section);
    },
    [selectNav]
  );

  const handleSelectNav = useCallback(
    (section: SellerHelperNavItem) => {
      setVisualNav(section);
      selectNav(section);
    },
    [selectNav]
  );

  const showPanel = (item: SellerHelperNavItem, content: React.ReactNode) => {
    if (!visitedSections.has(item)) return null;
    return (
      <InstantPanel
        active={visualNav === item}
        mounted
        panelId={`seller-helper-section-${item.replace(/\s+/g, "-").toLowerCase()}`}
      >
        {content}
      </InstantPanel>
    );
  };

  return (
    <div className={sellerHelperStack}>
      <div className={sellerHero}>
        <div className={sellerHeroInner}>
          <div className="max-w-3xl space-y-2">
            <p className="inline-flex items-center gap-2 text-custom-sm font-medium text-orange">
              <SellerHelperLogo size={22} title="Seller Helper" />
              {isAdminEmbed ? "E-Commerce Intelligence" : "Seller Helper"}
            </p>
            <h2 className="text-2xl font-semibold text-dark sm:text-custom-2">
              {isAdminEmbed ? "Analysis & recommendation system" : "Your store dashboard"}
            </h2>
            <div className="flex flex-wrap items-stretch gap-2.5 pt-2">
              <div
                className={cn(
                  sellerHeroMetric,
                  overview?.hasEventData ?
                    "border-teal/30"
                  : "border-gray-3"
                )}
              >
                <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
                  {overview?.hasEventData ?
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-50" />
                  : null}
                  <span
                    className={cn(
                      "relative inline-flex h-2.5 w-2.5 rounded-full",
                      overview?.hasEventData ? "bg-teal" : "bg-gray-4"
                    )}
                  />
                </span>
                <div className="min-w-0">
                  <p className={sellerHeroMetricTitle}>
                    {overview?.hasEventData ? "Live data" : "Waiting for data"}
                  </p>
                  <p className={sellerHeroMetricHint}>Auto-refresh on</p>
                </div>
              </div>

              <div className={cn(sellerHeroMetric, "border-gray-3")}>
                <Users className="h-4 w-4 shrink-0 text-orange" aria-hidden />
                <div className="min-w-0">
                  <p className={cn(sellerHeroMetricTitle, "tabular-nums")}>
                    {overview ? formatSessions15m(overview.activeVisitors15m) : "—"}
                  </p>
                  <p className={sellerHeroMetricHint}>Last 15 minutes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            {!isAdminEmbed ?
              <Link href="/admin" className={sellerSecondaryButton}>
                <Settings className="h-4 w-4" aria-hidden />
                Open admin
              </Link>
            : null}
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
                {analyzeBusy ? "Analyzing…" : "Analyze now"}
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

      <SellerHelperNav
        activeNav={visualNav}
        ariaLabel={isAdminEmbed ? "Intelligence sections" : "Seller Helper sections"}
        onSelect={handleSelectNav}
      />

      <div id="seller-helper-active-section" className="relative min-h-[12rem]">
        {showPanel(
          "Dashboard",
          <DashboardMainContent overview={overview} loading={loading} trafficSeries={trafficSeries} />
        )}
        {showPanel("Conversion Funnel", <ConversionFunnelContent overview={overview} />)}
        {showPanel(
          "User Behavior",
          <UserBehaviorContent
            behavior={overview?.userBehavior ?? null}
            onNavigateSection={handleNavigateSection}
          />
        )}
        {showPanel(
          "Vitrina Recommendation",
          <VitrinaRecommendationsContent
            recommendations={vitrinaRecommendations}
            fixesPerItem={vitrinaFixesPerItem}
            onFixesPerItemChange={setVitrinaFixesPerItem}
            fixesPerItemBusy={vitrinaReloadBusy}
            onVitrinaQuickFixApplied={dismissVitrinaAfterQuickFix}
            onClearAllRecommendations={clearAllVitrinaRecommendations}
            onDeleteProductData={clearVitrinaProductData}
            onResetAllCatalogToDefault={resetAllVitrinaCatalogToDefault}
          />
        )}
        {showPanel(
          "AI Recommendations",
          <AiRecommendationsContent
            recommendations={recommendations}
            overview={overview}
            onDismissRecommendation={dismissRecommendation}
            onSendRecommendationEmail={sendRecommendationEmail}
            onClearAllRecommendations={clearAllRecommendations}
          />
        )}
        {showPanel(
          "Inbox",
          <InboxContent
            inbox={inbox}
            onMarkImplemented={markInboxImplemented}
            onDismiss={dismissInboxItem}
          />
        )}
        {showPanel("Timeline", <TimelineContent />)}
        {showPanel(
          "Security",
          <SecurityTabContent overview={overview} onClearAllSecurity={clearAllSecurity} />
        )}
        {showPanel(
          "Alerts",
          <AlertsContent
            alerts={alerts}
            resolvedAlerts={resolvedAlerts}
            alertRules={overview?.alertRules ?? []}
            onNavigateSection={handleNavigateSection}
            onDismissAlert={dismissAlert}
            onClearAllAlerts={clearAllAlerts}
            onAlertRulesSaved={() => void refresh()}
          />
        )}
      </div>
    </div>
  );
}

export default memo(SellerHelperDashboardInner);
