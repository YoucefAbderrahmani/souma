"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import type {
  ConceptionAlertDto,
  ConceptionOverviewDto,
  ConceptionRecommendationDto,
  ConceptionResolvedAlertDto,
} from "@/types/conception-admin";
import { readJsonResponse } from "@/lib/admin-api-response";
import {
  readCachedVitrinaRecommendations,
  writeCachedVitrinaRecommendations,
  filterOutQuickFixAppliedRecommendations,
  clearVitrinaQuickFixAppliedProductIds,
  removeVitrinaQuickFixAppliedProductId,
} from "@/lib/vitrina-recommendations-cache";
import type { VitrinaProductMarketingRecommendation } from "@/types/vitrina-product-recommendations";
import { clearAllPromoTimerSessionStorage } from "@/lib/product-demo-promo-labels";
import {
  clampVitrinaFixesPerItem,
  DEFAULT_VITRINA_FIXES_PER_ITEM,
  readVitrinaFixesPerItemFromStorage,
  vitrinaRecommendationsApiUrl,
  writeVitrinaFixesPerItemToStorage,
} from "@/lib/vitrina-fixes-per-item";

export type ConceptionAdminInitialData = {
  overview: ConceptionOverviewDto;
  alerts: ConceptionAlertDto[];
  resolvedAlerts: ConceptionResolvedAlertDto[];
  recommendations: ConceptionRecommendationDto[];
  inbox?: ConceptionRecommendationDto[];
  vitrinaRecommendations?: VitrinaProductMarketingRecommendation[];
};

type State = {
  overview: ConceptionOverviewDto | null;
  alerts: ConceptionAlertDto[];
  resolvedAlerts: ConceptionResolvedAlertDto[];
  recommendations: ConceptionRecommendationDto[];
  inbox: ConceptionRecommendationDto[];
  vitrinaRecommendations: VitrinaProductMarketingRecommendation[];
  loading: boolean;
  error: string | null;
  analyzeBusy: boolean;
  analyzeMessage: string | null;
  actionMessage: string | null;
  vitrinaFixesPerItem: number;
  vitrinaReloadBusy: boolean;
};

const fetchOptions: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

function getInitialVitrinaFixesPerItem() {
  if (typeof window === "undefined") return DEFAULT_VITRINA_FIXES_PER_ITEM;
  return readVitrinaFixesPerItemFromStorage();
}

function getInitialVitrinaRecommendations(fixesPerItem: number) {
  if (typeof window === "undefined") return [];
  return filterOutQuickFixAppliedRecommendations(readCachedVitrinaRecommendations(fixesPerItem));
}

export type UseConceptionAdminDataOptions = {
  /** Background poll interval (default 5s). Use 60s+ in embedded admin to avoid UI jank. */
  liveRefreshIntervalMs?: number;
  liveRefreshEnabled?: boolean;
};

export function useConceptionAdminData(
  initialData?: ConceptionAdminInitialData,
  initialError: string | null = null,
  options?: UseConceptionAdminDataOptions
) {
  const liveRefreshIntervalMs = options?.liveRefreshIntervalMs ?? 5_000;
  const liveRefreshEnabled = options?.liveRefreshEnabled ?? true;
  const loadGenerationRef = useRef(0);
  const initialFixesPerItem = getInitialVitrinaFixesPerItem();
  const [state, setState] = useState<State>({
    overview: initialData?.overview ?? null,
    alerts: initialData?.alerts ?? [],
    resolvedAlerts: initialData?.resolvedAlerts ?? [],
    recommendations: initialData?.recommendations ?? [],
    inbox: initialData?.inbox ?? [],
    vitrinaRecommendations: getInitialVitrinaRecommendations(initialFixesPerItem),
    loading: !initialData,
    error: initialError,
    analyzeBusy: false,
    analyzeMessage: null,
    actionMessage: null,
    vitrinaFixesPerItem: initialFixesPerItem,
    vitrinaReloadBusy: false,
  });

  const fetchVitrinaRecommendations = useCallback(
    async (fixesPerItem: number, options?: { regenerate?: boolean; silent?: boolean }) => {
      const clamped = clampVitrinaFixesPerItem(fixesPerItem);
      if (!options?.silent) {
        setState((s) => ({ ...s, vitrinaReloadBusy: true }));
      }
      try {
        const res = await fetch(
          vitrinaRecommendationsApiUrl(clamped, { regenerate: options?.regenerate }),
          fetchOptions
        );
        const body = await readJsonResponse<{
          error?: string;
          message?: string;
          recommendations?: VitrinaProductMarketingRecommendation[];
        }>(res, "Vitrina recommendations API");
        if (!res.ok) throw new Error(body.message || body.error || "Vitrina cache unavailable");
        const recommendations = Array.isArray(body.recommendations) ? body.recommendations : [];
        setState((current) => ({
          ...current,
          vitrinaRecommendations: filterOutQuickFixAppliedRecommendations(recommendations),
          vitrinaFixesPerItem: clamped,
        }));
        writeCachedVitrinaRecommendations(recommendations);
        return recommendations;
      } catch {
        return null;
      } finally {
        if (!options?.silent) {
          setState((s) => ({ ...s, vitrinaReloadBusy: false }));
        }
      }
    },
    []
  );

  const setVitrinaFixesPerItem = useCallback(
    (next: number) => {
      const clamped = clampVitrinaFixesPerItem(next);
      writeVitrinaFixesPerItemToStorage(clamped);
      let regenerate = false;
      setState((s) => {
        regenerate = clamped > s.vitrinaFixesPerItem;
        return { ...s, vitrinaFixesPerItem: clamped };
      });
      void fetchVitrinaRecommendations(clamped, { regenerate });
    },
    [fetchVitrinaRecommendations]
  );

  const load = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const generation = ++loadGenerationRef.current;
    if (!background) {
      setState((s) => ({ ...s, loading: true, error: null }));
    }
    try {
      const [overviewRes, alertsRes, recommendationsRes, inboxRes] = await Promise.all([
        fetch("/api/admin/conception/overview", fetchOptions),
        fetch("/api/admin/conception/alerts", fetchOptions),
        fetch("/api/admin/conception/recommendations", fetchOptions),
        fetch("/api/admin/conception/inbox", fetchOptions),
      ]);

      const o = await readJsonResponse<{
        error?: string;
        message?: string;
        overview?: ConceptionOverviewDto;
      }>(overviewRes, "Overview API");
      const a = await readJsonResponse<{
        error?: string;
        message?: string;
        alerts?: ConceptionAlertDto[];
        resolvedAlerts?: ConceptionResolvedAlertDto[];
      }>(alertsRes, "Alerts API");
      const r = await readJsonResponse<{
        error?: string;
        message?: string;
        recommendations?: ConceptionRecommendationDto[];
      }>(recommendationsRes, "Recommendations API");
      const inboxBody = await readJsonResponse<{
        error?: string;
        message?: string;
        inbox?: ConceptionRecommendationDto[];
      }>(inboxRes, "Inbox API");

      if (o.error) throw new Error(o.message || o.error);
      if (a.error) throw new Error(a.message || a.error);
      if (r.error) throw new Error(r.message || r.error);
      if (inboxBody.error) throw new Error(inboxBody.message || inboxBody.error);

      if (generation !== loadGenerationRef.current) return;

      setState((s) => ({
        ...s,
        overview: o.overview as ConceptionOverviewDto,
        alerts: (a.alerts ?? []) as ConceptionAlertDto[],
        resolvedAlerts: (a.resolvedAlerts ?? []) as ConceptionResolvedAlertDto[],
        recommendations: (r.recommendations ?? []) as ConceptionRecommendationDto[],
        inbox: (inboxBody.inbox ?? []) as ConceptionRecommendationDto[],
        vitrinaRecommendations: s.vitrinaRecommendations,
        loading: false,
        error: background ? s.error : null,
      }));
    } catch (e) {
      if (generation !== loadGenerationRef.current) return;
      setState((s) => ({
        ...s,
        loading: false,
        error: background ? s.error : e instanceof Error ? e.message : String(e),
      }));
    }
  }, []);

  useEffect(() => {
    void load({ background: Boolean(initialData) });
  }, [initialData, load]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (cancelled) return;
      await fetchVitrinaRecommendations(initialFixesPerItem, { silent: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchVitrinaRecommendations, initialFixesPerItem]);

  const refreshLive = useCallback(() => load({ background: true }), [load]);
  useLiveDataRefresh(
    refreshLive,
    liveRefreshEnabled && !state.analyzeBusy,
    liveRefreshIntervalMs
  );

  const dismissAlert = useCallback(async (id: string, disposition: "resolved" | "ignored" = "resolved") => {
    setState((s) => ({ ...s, actionMessage: null }));
    try {
      const res = await fetch("/api/admin/conception/alerts", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, disposition }),
      });
      const body = await readJsonResponse<{ error?: string; message?: string }>(res, "Alerts API");
      if (!res.ok) throw new Error(body.message || body.error || "Dismiss failed");
      setState((s) => {
        const dismissed = s.alerts.find((alert) => alert.id === id);
        return {
          ...s,
          alerts: s.alerts.filter((alert) => alert.id !== id),
          resolvedAlerts:
            disposition === "resolved" && dismissed ?
              [
                {
                  id: dismissed.id,
                  alertType: dismissed.alertType,
                  title: dismissed.title,
                  description: dismissed.description,
                  detail: dismissed.detail,
                  dismissedAt: new Date().toISOString(),
                  createdAt: dismissed.createdAt,
                },
                ...s.resolvedAlerts,
              ].slice(0, 12)
            : s.resolvedAlerts,
          actionMessage:
            disposition === "ignored" ? "Alert temporarily ignored." : "Alert marked as resolved.",
        };
      });
      return true;
    } catch (e) {
      setState((s) => ({
        ...s,
        actionMessage: e instanceof Error ? e.message : String(e),
      }));
      return false;
    }
  }, []);

  const sendRecommendationEmail = useCallback(async (id: string) => {
    setState((s) => ({ ...s, actionMessage: null }));
    try {
      const res = await fetch("/api/admin/conception/recommendations/send-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId: id }),
      });
      const body = await readJsonResponse<{
        error?: string;
        message?: string;
        ok?: boolean;
      }>(res, "Send recommendation email API");

      if (!res.ok || body.ok === false) {
        throw new Error(body.message || body.error || "Failed to send email");
      }

      const successMessage =
        body.message || "Email sent via Brevo. Open Inbox to track follow-up.";

      setState((s) => ({
        ...s,
        recommendations: s.recommendations.filter((recommendation) => recommendation.id !== id),
        actionMessage: successMessage,
      }));

      try {
        const inboxRes = await fetch("/api/admin/conception/inbox", fetchOptions);
        const inboxJson = await readJsonResponse<{
          error?: string;
          inbox?: ConceptionRecommendationDto[];
        }>(inboxRes, "Inbox API");
        if (!inboxJson.error && Array.isArray(inboxJson.inbox)) {
          setState((s) => ({ ...s, inbox: inboxJson.inbox as ConceptionRecommendationDto[] }));
        }
      } catch {
        /* inbox refresh is best-effort */
      }

      return true;
    } catch (e) {
      setState((s) => ({
        ...s,
        actionMessage: e instanceof Error ? e.message : String(e),
      }));
      return false;
    }
  }, []);

  const dismissRecommendation = useCallback(async (id: string) => {
    setState((s) => ({ ...s, actionMessage: null }));
    try {
      const res = await fetch("/api/admin/conception/recommendations", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = await readJsonResponse<{ error?: string; message?: string }>(res, "Recommendations API");
      if (!res.ok) throw new Error(body.message || body.error || "Dismiss failed");
      setState((s) => ({
        ...s,
        recommendations: s.recommendations.filter((recommendation) => recommendation.id !== id),
        actionMessage: "Recommendation dismissed.",
      }));
      return true;
    } catch (e) {
      setState((s) => ({
        ...s,
        actionMessage: e instanceof Error ? e.message : String(e),
      }));
      return false;
    }
  }, []);

  const patchInboxItem = useCallback(async (id: string, action: "implement" | "dismiss") => {
    setState((s) => ({ ...s, actionMessage: null }));
    try {
      const res = await fetch("/api/admin/conception/inbox", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const body = await readJsonResponse<{ error?: string; message?: string }>(res, "Inbox API");
      if (!res.ok) throw new Error(body.message || body.error || "Inbox action failed");
      setState((s) => ({
        ...s,
        inbox: s.inbox.filter((item) => item.id !== id),
        actionMessage:
          action === "implement" ?
            "Marked as implemented."
          : "Inbox item dismissed.",
      }));
      return true;
    } catch (e) {
      setState((s) => ({
        ...s,
        actionMessage: e instanceof Error ? e.message : String(e),
      }));
      return false;
    }
  }, []);

  const markInboxImplemented = useCallback(
    (id: string) => patchInboxItem(id, "implement"),
    [patchInboxItem]
  );

  const dismissInboxItem = useCallback(
    (id: string) => patchInboxItem(id, "dismiss"),
    [patchInboxItem]
  );

  const clearAllRecommendations = useCallback(async () => {
    setState((s) => ({ ...s, actionMessage: null }));
    try {
      const res = await fetch("/api/admin/conception/recommendations", {
        method: "DELETE",
        ...fetchOptions,
      });
      const body = await readJsonResponse<{
        error?: string;
        message?: string;
        deleted?: number;
      }>(res, "Recommendations API");
      if (!res.ok || body.error) throw new Error(body.message || body.error || "Clear failed");
      const deleted = Number(body.deleted ?? 0);
      setState((s) => ({
        ...s,
        recommendations: [],
        inbox: [],
        actionMessage:
          deleted > 0 ?
            `Cleared ${deleted} recommendation(s).`
          : "No recommendations to clear.",
      }));
      await load({ background: true });
      return true;
    } catch (e) {
      setState((s) => ({
        ...s,
        actionMessage: e instanceof Error ? e.message : String(e),
      }));
      return false;
    }
  }, [load]);

  const clearAllAlerts = useCallback(async () => {
    setState((s) => ({ ...s, actionMessage: null }));
    try {
      const res = await fetch("/api/admin/conception/alerts", {
        method: "DELETE",
        ...fetchOptions,
      });
      const body = await readJsonResponse<{
        error?: string;
        message?: string;
        deleted?: number;
      }>(res, "Alerts API");
      if (!res.ok || body.error) throw new Error(body.message || body.error || "Clear failed");
      const deleted = Number(body.deleted ?? 0);
      setState((s) => ({
        ...s,
        alerts: [],
        resolvedAlerts: [],
        actionMessage:
          deleted > 0 ?
            `Cleared ${deleted} alert(s).`
          : "No alerts to clear.",
      }));
      await load({ background: true });
      return true;
    } catch (e) {
      setState((s) => ({
        ...s,
        actionMessage: e instanceof Error ? e.message : String(e),
      }));
      return false;
    }
  }, [load]);

  const clearAllSecurity = useCallback(async () => {
    setState((s) => ({ ...s, actionMessage: null }));
    try {
      const res = await fetch("/api/admin/conception/security", {
        method: "DELETE",
        ...fetchOptions,
      });
      const body = await readJsonResponse<{
        error?: string;
        message?: string;
        lifted?: number;
      }>(res, "Security API");
      if (!res.ok || body.error) throw new Error(body.message || body.error || "Clear failed");
      const lifted = Number(body.lifted ?? 0);
      setState((s) => ({
        ...s,
        actionMessage:
          lifted > 0 ?
            `Unblocked ${lifted} session(s).`
          : "No active session blocks.",
      }));
      await load({ background: true });
      return true;
    } catch (e) {
      setState((s) => ({
        ...s,
        actionMessage: e instanceof Error ? e.message : String(e),
      }));
      return false;
    }
  }, [load]);

  const runAnalyze = useCallback(async () => {
    loadGenerationRef.current += 1;
    setState((s) => ({ ...s, analyzeBusy: true, analyzeMessage: null }));
    try {
      const fixesPerItem = readVitrinaFixesPerItemFromStorage();
      const res = await fetch("/api/admin/conception/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixesPerItem }),
      });
      const body = await readJsonResponse<{
        error?: string;
        message?: string;
        insertedAlerts?: number;
        insertedRecommendations?: number;
        emailsSent?: number;
        emailsFailed?: number;
        llmUsed?: boolean;
        llmSummary?: string;
        llmError?: string;
        llmModel?: string;
        geminiConfigured?: boolean;
        baselineRecommendationsInserted?: number;
        vitrinaRecommendations?: VitrinaProductMarketingRecommendation[];
      }>(res, "Analyze API");
      if (!res.ok) throw new Error(body.message || body.error || "Analyze failed");
      const insertedAlerts = Number(body.insertedAlerts ?? 0);
      const insertedRecommendations = Number(body.insertedRecommendations ?? 0);
      const emailsSent = Number(body.emailsSent ?? 0);
      const emailsFailed = Number(body.emailsFailed ?? 0);
      const llmUsed = Boolean(body.llmUsed);
      const llmSummary = typeof body.llmSummary === "string" ? body.llmSummary : null;
      const llmError = typeof body.llmError === "string" ? body.llmError : null;
      const llmModel = typeof body.llmModel === "string" ? body.llmModel : null;
      const geminiConfigured = Boolean(body.geminiConfigured);
      const baselineInserted = Number(body.baselineRecommendationsInserted ?? 0);
      const vitrinaRecommendations = Array.isArray(body.vitrinaRecommendations) ?
        (body.vitrinaRecommendations as VitrinaProductMarketingRecommendation[])
      : [];

      let analyzeMessage = `Done — ${insertedAlerts} alert(s), ${insertedRecommendations} recommendation(s), ${vitrinaRecommendations.length} Vitrina suggestion(s).`;
      if (emailsSent > 0) {
        analyzeMessage = `${analyzeMessage} ${emailsSent} email(s) sent.`;
      }
      if (emailsFailed > 0) {
        analyzeMessage = `${analyzeMessage} ${emailsFailed} email(s) failed.`;
      }
      if (baselineInserted > 0 && !llmUsed) {
        analyzeMessage = `${analyzeMessage} ${baselineInserted} fallback recommendation(s) added.`;
      }
      if (llmUsed && llmSummary) {
        analyzeMessage = `${analyzeMessage} ${llmSummary}`;
      } else if (llmError) {
        analyzeMessage = `${analyzeMessage} Analysis service error.`;
      }

      clearVitrinaQuickFixAppliedProductIds();
      setState((s) => ({
        ...s,
        analyzeBusy: false,
        analyzeMessage,
        vitrinaRecommendations,
      }));
      writeCachedVitrinaRecommendations(vitrinaRecommendations);
      await load({ background: true });
    } catch (e) {
      setState((s) => ({
        ...s,
        analyzeBusy: false,
        analyzeMessage: e instanceof Error ? e.message : String(e),
      }));
    }
  }, [load]);

  const clearAllVitrinaRecommendations = useCallback(async () => {
    setState((s) => ({ ...s, actionMessage: null }));
    try {
      const res = await fetch("/api/admin/conception/vitrina-recommendations/clear", {
        method: "POST",
        credentials: "include",
      });
      const body = await readJsonResponse<{
        ok?: boolean;
        message?: string;
        error?: string;
        recommendations?: VitrinaProductMarketingRecommendation[];
      }>(res, "Clear Vitrina recommendations API");
      if (!res.ok || body.ok === false) {
        throw new Error(body.message || body.error || "Clear failed");
      }
      clearVitrinaQuickFixAppliedProductIds();
      writeCachedVitrinaRecommendations([]);
      setState((s) => ({
        ...s,
        vitrinaRecommendations: [],
        actionMessage: body.message ?? "Vitrina recommendations cleared.",
      }));
      return true;
    } catch (e) {
      setState((s) => ({
        ...s,
        actionMessage: e instanceof Error ? e.message : String(e),
      }));
      return false;
    }
  }, []);

  const resetAllVitrinaCatalogToDefault = useCallback(async () => {
    setState((s) => ({ ...s, actionMessage: null }));
    try {
      const res = await fetch("/api/admin/conception/vitrina-recommendations/reset-catalog-default", {
        method: "POST",
        credentials: "include",
      });
      const body = await readJsonResponse<{
        ok?: boolean;
        message?: string;
        error?: string;
        updatedCount?: number;
      }>(res, "Reset Vitrina catalog API");
      if (!res.ok || body.ok === false) {
        throw new Error(body.message || body.error || "Reset failed");
      }
      clearAllPromoTimerSessionStorage();
      setState((s) => ({
        ...s,
        actionMessage: body.message ?? "Catalog reset to default Vitrina merchandising.",
      }));
      await load({ background: true });
      return true;
    } catch (e) {
      setState((s) => ({
        ...s,
        actionMessage: e instanceof Error ? e.message : String(e),
      }));
      return false;
    }
  }, [load]);

  const dismissVitrinaAfterQuickFix = useCallback(
    async (productId: string) => {
      removeVitrinaQuickFixAppliedProductId(productId);
      await fetchVitrinaRecommendations(readVitrinaFixesPerItemFromStorage(), { silent: true });
    },
    [fetchVitrinaRecommendations]
  );

  return {
    ...state,
    refresh: load,
    runAnalyze,
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
    resetAllVitrinaCatalogToDefault,
    vitrinaFixesPerItem: state.vitrinaFixesPerItem,
    vitrinaReloadBusy: state.vitrinaReloadBusy,
    setVitrinaFixesPerItem,
  };
}
