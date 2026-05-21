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
};

const fetchOptions: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

function getInitialVitrinaRecommendations() {
  if (typeof window === "undefined") return [];
  return filterOutQuickFixAppliedRecommendations(readCachedVitrinaRecommendations());
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
  const [state, setState] = useState<State>({
    overview: initialData?.overview ?? null,
    alerts: initialData?.alerts ?? [],
    resolvedAlerts: initialData?.resolvedAlerts ?? [],
    recommendations: initialData?.recommendations ?? [],
    inbox: initialData?.inbox ?? [],
    vitrinaRecommendations: getInitialVitrinaRecommendations(),
    loading: !initialData,
    error: initialError,
    analyzeBusy: false,
    analyzeMessage: null,
    actionMessage: null,
  });

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
      try {
        const res = await fetch("/api/admin/conception/vitrina-recommendations", fetchOptions);
        const body = await readJsonResponse<{
          error?: string;
          message?: string;
          recommendations?: VitrinaProductMarketingRecommendation[];
        }>(res, "Vitrina recommendations API");
        if (!res.ok) throw new Error(body.message || body.error || "Vitrina cache unavailable");
        const recommendations = body.recommendations;
        if (cancelled || !Array.isArray(recommendations)) return;

        setState((current) => {
          if (recommendations.length === 0 && current.vitrinaRecommendations.length > 0) {
            return current;
          }
          return {
            ...current,
            vitrinaRecommendations: filterOutQuickFixAppliedRecommendations(recommendations),
          };
        });
        writeCachedVitrinaRecommendations(recommendations);
      } catch {
        // Keep the last cached snapshot when the cache endpoint is unavailable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
            `Cleared ${deleted} recommendation(s) from the database. Click Analyze now to start fresh.`
          : "No stored recommendations in the database. Click Analyze now to generate your first set.",
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
            `Cleared ${deleted} alert(s) from the database. Run Analyze now to detect new incidents.`
          : "No stored alerts in the database. Run Analyze now to generate new alerts.",
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
            `Unblocked ${lifted} session(s). Live threat signals may still appear from micro-events until you refresh or run Analyze.`
          : "No active session blocks. Live threat signals are computed from micro-events and may still appear on refresh.",
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
      const res = await fetch("/api/admin/conception/analyze", {
        method: "POST",
        credentials: "include",
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

      let analyzeMessage = `Analysis complete — ${insertedAlerts} alert(s), ${insertedRecommendations} recommendation(s), ${vitrinaRecommendations.length} storefront recommendation(s).`;
      if (emailsSent > 0) {
        analyzeMessage = `${analyzeMessage} ${emailsSent} role email(s) sent automatically (BREVO_AUTO_SEND_ON_ANALYZE=true).`;
      }
      if (emailsFailed > 0) {
        analyzeMessage = `${analyzeMessage} ${emailsFailed} email(s) could not be sent (check BREVO_API_KEY, EMAIL_FROM, and role addresses).`;
      }
      if (baselineInserted > 0 && !llmUsed) {
        analyzeMessage = `${analyzeMessage} Added ${baselineInserted} baseline recommendation(s) from catalogue/telemetry (AI was unavailable).`;
      }
      if (llmUsed && llmSummary) {
        analyzeMessage = `${analyzeMessage} AI summary (${llmModel ?? "LLM"}): ${llmSummary}`;
      } else if (llmError) {
        const needsOpenRouterCredits = llmError.includes("402") || /insufficient credits/i.test(llmError);
        const geminiQuotaExceeded = /Gemini.*\(429\)|quota exceeded/i.test(llmError);
        const geminiAlsoFailed = /Gemini\s*:/i.test(llmError);

        if (needsOpenRouterCredits && !geminiConfigured) {
          analyzeMessage = `${analyzeMessage} OpenRouter has no credits. Add GOOGLE_API_KEY on Vercel (Google AI Studio → Create API key) for free Gemini fallback, or top up OpenRouter.`;
        } else if (needsOpenRouterCredits && geminiAlsoFailed) {
          analyzeMessage = `${analyzeMessage} OpenRouter has no credits and Gemini fallback failed: ${llmError}`;
        } else if (needsOpenRouterCredits && geminiConfigured) {
          analyzeMessage = `${analyzeMessage} OpenRouter has no credits. Gemini is configured but did not return results — check GOOGLE_API_KEY validity and quota.`;
        } else if (geminiQuotaExceeded) {
          analyzeMessage = `${analyzeMessage} Gemini quota exceeded. Top up OpenRouter or wait for the Google quota reset.`;
        } else {
          analyzeMessage = `${analyzeMessage} AI analysis unavailable: ${llmError}`;
        }
      } else if (!llmUsed) {
        analyzeMessage = `${analyzeMessage} Set OPENROUTER_API_KEY or GOOGLE_API_KEY to enable full AI analysis.`;
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

  const dismissVitrinaAfterQuickFix = useCallback(async (productId: string) => {
    removeVitrinaQuickFixAppliedProductId(productId);
    try {
      const res = await fetch("/api/admin/conception/vitrina-recommendations", fetchOptions);
      const body = await readJsonResponse<{
        error?: string;
        message?: string;
        recommendations?: VitrinaProductMarketingRecommendation[];
      }>(res, "Vitrina recommendations API");
      if (!res.ok) return;
      const recommendations = Array.isArray(body.recommendations) ? body.recommendations : [];
      setState((s) => ({
        ...s,
        vitrinaRecommendations: filterOutQuickFixAppliedRecommendations(recommendations),
      }));
      writeCachedVitrinaRecommendations(recommendations);
    } catch {
      /* keep current list if refetch fails */
    }
  }, []);

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
  };
}
