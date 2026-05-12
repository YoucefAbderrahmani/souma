"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Ban, Shield } from "lucide-react";
import type { ConceptionOverviewDto } from "@/types/conception-admin";
import { cn } from "@/lib/utils";
import { ProgressBar, ThreatActivityChart } from "./charts";
import SecurityQuickFixConfirmModal from "./SecurityQuickFixConfirmModal";
import {
  sellerAccentStrip,
  sellerGhostButton,
  sellerHelperGrid,
  sellerHelperStack,
  sellerInsightBadge,
  sellerInsightRow,
  sellerInsightTone,
  sellerPanel,
  sellerPanelPadding,
  sellerPlaceholder,
  sellerPrimaryButton,
  sellerTable,
  sellerTableHead,
  sellerTableRow,
  sellerTableWrap,
} from "./layout";

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

function formatCount(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function incidentBadgeClass(tone: "risk" | "attention" | "guidance") {
  if (tone === "risk") return sellerInsightBadge.risk;
  if (tone === "attention") return sellerInsightBadge.attention;
  return sellerInsightBadge.guidance;
}

function incidentRowClass(tone: "risk" | "attention" | "guidance") {
  if (tone === "risk") return sellerInsightTone.risk;
  if (tone === "attention") return sellerInsightTone.attention;
  return sellerInsightTone.guidance;
}

type QuickFixTarget =
  | { kind: "incident"; item: NonNullable<ConceptionOverviewDto["security"]["incidents"]>[number] }
  | { kind: "blocked"; item: NonNullable<ConceptionOverviewDto["security"]["blockedIdentities"]>[number] };

export function SecurityTabContent({ overview }: { overview: ConceptionOverviewDto | null }) {
  const security = overview?.security;
  const [quickFixTarget, setQuickFixTarget] = useState<QuickFixTarget | null>(null);

  const kpis = security?.kpis ?? [];
  const threatActivity24h = security?.threatActivity24h ?? [];
  const threatTypes7d = security?.threatTypes7d ?? [];
  const incidents = security?.incidents ?? [];
  const blockedIdentities = security?.blockedIdentities ?? [];

  const hasThreatActivity = useMemo(
    () => threatActivity24h.some((value) => value > 0),
    [threatActivity24h]
  );

  return (
    <>
      <div className={sellerHelperStack}>
        <SectionHeading
          title="Sécurité & intégrité des données"
          description="Signaux calculés à partir des micro-événements des 7 derniers jours"
          icon={Shield}
        />

        <div className={sellerHelperGrid.four}>
          {kpis.length === 0 ?
            <div className={cn(sellerPlaceholder, "col-span-full")}>
              Aucun signal de sécurité disponible pour le moment.
            </div>
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
              </p>
            </Panel>
          ))}
        </div>

        {security ?
          <Panel>
            <SectionHeading
              title="Formule du score de sécurité"
              description="Le score est recalculé à chaque rafraîchissement"
              icon={Shield}
            />
            <p className="mt-3 text-custom-sm text-dark-3">{security.scoreFormula}</p>
            <p className="mt-2 text-xs text-dark-4">
              Dernier calcul : {new Date(security.computedAt).toLocaleString("fr-FR")}
            </p>
          </Panel>
        : null}

        <div className={sellerHelperGrid.two}>
          <Panel>
            <SectionHeading
              title="Activité des menaces (24h)"
              description="Évolution des événements issus de sessions à risque"
              icon={AlertTriangle}
            />
            {hasThreatActivity ?
              <div className="mt-4 -mx-1">
                <ThreatActivityChart series={threatActivity24h} />
              </div>
            : <div className={cn(sellerPlaceholder, "mt-4")}>
                Aucune activité de menace enregistrée sur les dernières 24 heures.
              </div>
            }
          </Panel>

          <Panel>
            <SectionHeading
              title="Types de menaces"
              description="Distribution sur 7 jours"
              icon={Ban}
            />
            <div className="mt-4 space-y-4">
              {threatTypes7d.length === 0 || threatTypes7d.every((item) => item.count === 0) ?
                <div className={sellerPlaceholder}>Aucun type de menace détecté.</div>
              : threatTypes7d.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-custom-sm">
                    <span className="font-medium text-dark">{item.label}</span>
                    <span className="tabular-nums text-dark-4">
                      {item.pct}% ({formatCount(item.count)})
                    </span>
                  </div>
                  <ProgressBar value={item.pct} />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel>
          <SectionHeading
            title="Activités suspectes détectées"
            description="Sessions à risque et actions recommandées"
            icon={AlertTriangle}
          />
          {incidents.length === 0 ?
            <div className={cn(sellerPlaceholder, "mt-4")}>Aucune activité suspecte détectée.</div>
          : <div className="mt-4 space-y-3">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className={cn(sellerInsightRow, incidentRowClass(incident.statusTone))}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={incidentBadgeClass(incident.statusTone)}>{incident.statusLabel}</span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-dark-4">
                        {incident.category}
                      </span>
                      <span className="text-xs font-medium text-dark-4">
                        Score de risque {incident.riskScore}/100
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-dark">{incident.title}</p>
                    <p className="text-custom-sm text-dark-3">{incident.detail}</p>
                    <p className="text-xs text-dark-4">
                      {incident.displayIdentity} • {incident.location} • {incident.timeAgoLabel}
                    </p>
                  </div>
                  {(incident.quickFixes?.length ?? 0) > 0 ?
                    <button
                      type="button"
                      className={sellerPrimaryButton}
                      onClick={() => setQuickFixTarget({ kind: "incident", item: incident })}
                    >
                      Action rapide
                    </button>
                  : null}
                </div>
              ))}
            </div>
          }
        </Panel>

        <Panel>
          <SectionHeading
            title="Sessions bloquées"
            description="Liste noire active pour la collecte micro-événements"
            icon={Ban}
          />
          {blockedIdentities.length === 0 ?
            <div className={cn(sellerPlaceholder, "mt-4")}>Aucune session bloquée pour le moment.</div>
          : <div className={cn(sellerTableWrap, "mt-4")}>
              <table className={sellerTable}>
                <thead className={sellerTableHead}>
                  <tr>
                    <th className="px-3 py-2 font-medium">Identité client</th>
                    <th className="px-3 py-2 font-medium">Raison</th>
                    <th className="px-3 py-2 font-medium">Événements</th>
                    <th className="px-3 py-2 font-medium">Bloqué</th>
                    <th className="px-3 py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedIdentities.map((row) => (
                    <tr key={row.id} className={sellerTableRow}>
                      <td className="px-3 py-3 font-medium text-dark">{row.displayIdentity}</td>
                      <td className="px-3 py-3">{row.reason}</td>
                      <td className="px-3 py-3 tabular-nums">{formatCount(row.blockedRequests)}</td>
                      <td className="px-3 py-3 text-dark-4">{row.blockedAgoLabel}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          className={sellerGhostButton}
                          onClick={() => setQuickFixTarget({ kind: "blocked", item: row })}
                        >
                          Débloquer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </Panel>

        {(security?.notes ?? []).length > 0 ?
          <Panel>
            <SectionHeading
              title="Notes du moteur"
              description="Signaux issus des micro-événements en direct"
              icon={Shield}
            />
            <ul className="mt-4 space-y-2 text-custom-sm text-dark-3">
              {(security?.notes ?? []).map((note) => (
                <li key={note} className="rounded-lg border border-gray-3 bg-gray-1 px-3 py-2.5">
                  {note}
                </li>
              ))}
            </ul>
          </Panel>
        : null}
      </div>

      {quickFixTarget ?
        <SecurityQuickFixConfirmModal target={quickFixTarget} onClose={() => setQuickFixTarget(null)} />
      : null}
    </>
  );
}
