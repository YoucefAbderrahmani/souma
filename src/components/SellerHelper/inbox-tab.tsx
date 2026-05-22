"use client";

import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import type { ConceptionRecommendationDto } from "@/types/conception-admin";
import { DEFAULT_RECOMMENDATION_ROLE_DEFINITIONS } from "@/lib/recommendation-roles";
import { sortByImportance } from "@/lib/importance-ranking";
import { cn } from "@/lib/utils";
import { AiRecommendationCard } from "./AiRecommendationCard";
import { mapConceptionRecommendationToCard } from "./ai-recommendation-card-utils";
import { sellerHelperStack, sellerHelperGrid, sellerPanel, sellerPanelPadding } from "./layout";

const ALL_INBOX_ROLES = "all" as const;

type InboxRoleFilter = typeof ALL_INBOX_ROLES | string;

function inboxRoleFilterButtonClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
    active ?
      "border-orange bg-orange text-white shadow-sm"
    : "border-gray-3 bg-white text-dark hover:border-orange hover:bg-orange/10 hover:text-orange"
  );
}

export function InboxContent({
  inbox,
  onMarkImplemented,
  onDismiss,
}: {
  inbox: ConceptionRecommendationDto[];
  onMarkImplemented?: (id: string) => Promise<boolean>;
  onDismiss?: (id: string) => Promise<boolean>;
}) {
  const [roleFilter, setRoleFilter] = useState<InboxRoleFilter>(ALL_INBOX_ROLES);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const roleOptions = useMemo(() => {
    const keys = new Set(inbox.map((item) => item.assignedRoleKey));
    const defs = DEFAULT_RECOMMENDATION_ROLE_DEFINITIONS.filter((d) => keys.has(d.roleKey));
    for (const item of inbox) {
      if (!defs.some((d) => d.roleKey === item.assignedRoleKey)) {
        defs.push({
          roleKey: item.assignedRoleKey,
          displayName: item.assignedRoleLabel,
        });
      }
    }
    return defs;
  }, [inbox]);

  const countByRole = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of inbox) {
      counts.set(item.assignedRoleKey, (counts.get(item.assignedRoleKey) ?? 0) + 1);
    }
    return counts;
  }, [inbox]);

  const filtered = useMemo(() => {
    const list =
      roleFilter === ALL_INBOX_ROLES ?
        inbox
      : inbox.filter((item) => item.assignedRoleKey === roleFilter);
    return sortByImportance(list, (item) => item.priority).map(mapConceptionRecommendationToCard);
  }, [inbox, roleFilter]);

  const runAction = async (key: string, action: "implement" | "dismiss") => {
    setBusyKey(key);
    setActionKey(`${action}:${key}`);
    const handler = action === "implement" ? onMarkImplemented : onDismiss;
    const ok = await handler?.(key);
    if (ok && expandedKey === key) setExpandedKey(null);
    setBusyKey(null);
    setActionKey(null);
  };

  const summary = [
    { label: "In inbox", value: String(inbox.length) },
    {
      label: "This view",
      value: String(filtered.length),
    },
    {
      label: "Roles",
      value: String(roleOptions.length),
    },
  ];

  return (
    <div className={sellerHelperStack}>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-dark">
            <Inbox className="h-5 w-5 text-orange" aria-hidden />
            Inbox
          </h3>
          {filtered.length > 0 ?
            <span className="rounded-full bg-orange px-2.5 py-0.5 text-[13px] font-bold text-white tabular-nums">
              {filtered.length}
            </span>
          : null}
        </div>
        <p className="text-custom-sm text-dark-4">
          After you send a recommendation email, it moves here for that role. Mark as implemented when done, or
          dismiss to close it out.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-custom-sm font-medium text-dark-3">View inbox for</p>
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter inbox by role"
        >
          <button
            type="button"
            role="tab"
            aria-selected={roleFilter === ALL_INBOX_ROLES}
            onClick={() => setRoleFilter(ALL_INBOX_ROLES)}
            className={inboxRoleFilterButtonClass(roleFilter === ALL_INBOX_ROLES)}
          >
            All roles
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                roleFilter === ALL_INBOX_ROLES ? "bg-white/25 text-white" : "bg-gray-2 text-dark-4"
              )}
            >
              {inbox.length}
            </span>
          </button>
          {roleOptions.map((role) => {
            const active = roleFilter === role.roleKey;
            const count = countByRole.get(role.roleKey) ?? 0;
            return (
              <button
                key={role.roleKey}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRoleFilter(role.roleKey)}
                className={inboxRoleFilterButtonClass(active)}
              >
                {role.displayName}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    active ? "bg-white/25 text-white" : "bg-gray-2 text-dark-4"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={sellerHelperGrid.three}>
        {summary.map((item) => (
          <Panel key={item.label}>
            <p className="text-custom-sm text-dark-4">{item.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-dark">{item.value}</p>
          </Panel>
        ))}
      </div>

      {filtered.length === 0 ?
        <div className="rounded-lg border border-dashed border-gray-4 bg-gray-1 px-4 py-8 text-center text-custom-sm text-dark-4">
          {inbox.length === 0 ?
            "Inbox is empty."
          : "No items for this role."}
        </div>
      : <div className="flex flex-col gap-3">
          {filtered.map((rec, index) => (
            <AiRecommendationCard
              key={rec.key}
              rec={rec}
              animationIndex={index}
              expanded={expandedKey === rec.key}
              busy={busyKey === rec.key}
              onToggleExpand={() =>
                setExpandedKey((current) => (current === rec.key ? null : rec.key))
              }
              onDismiss={() => void runAction(rec.key, "dismiss")}
              onMarkImplemented={() => void runAction(rec.key, "implement")}
              markImplementedBusy={actionKey === `implement:${rec.key}`}
              showEmailSentBadge
            />
          ))}
        </div>
      }
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className={`${sellerPanel} ${sellerPanelPadding}`}>{children}</div>;
}
