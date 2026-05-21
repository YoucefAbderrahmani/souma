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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex flex-col gap-1.5 text-custom-sm text-dark-4 sm:flex-row sm:items-center sm:gap-3">
          <span className="font-medium text-dark-3">View inbox for</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as InboxRoleFilter)}
            className="min-w-[12rem] rounded-lg border border-gray-3 bg-white px-3 py-2 text-sm font-medium text-dark focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange/30"
          >
            <option value={ALL_INBOX_ROLES}>All roles</option>
            {roleOptions.map((role) => (
              <option key={role.roleKey} value={role.roleKey}>
                {role.displayName}
              </option>
            ))}
          </select>
        </label>
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
            "No items in any role inbox yet. Send a recommendation email from AI Recommendations to move one here."
          : "No inbox items for this role. Choose another role or send a new email."}
        </div>
      : <div className="flex flex-col gap-5">
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
