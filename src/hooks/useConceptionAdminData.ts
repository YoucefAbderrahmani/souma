"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import type {
  ConceptionAlertDto,
  ConceptionOverviewDto,
  ConceptionRecommendationDto,
  ConceptionResolvedAlertDto,
} from "@/types/conception-admin";
import { readJsonResponse } from "@/lib/admin-api-response";
import type { VitrinaProductMarketingRecommendation } from "@/types/vitrina-product-recommendations";

export type ConceptionAdminInitialData = {
  overview: ConceptionOverviewDto;
  alerts: ConceptionAlertDto[];
  resolvedAlerts: ConceptionResolvedAlertDto[];
  recommendations: ConceptionRecommendationDto[];
  vitrinaRecommendations?: VitrinaProductMarketingRecommendation[];
};

type State = {
  overview: ConceptionOverviewDto | null;
  alerts: ConceptionAlertDto[];
  resolvedAlerts: ConceptionResolvedAlertDto[];
  recommendations: ConceptionRecommendationDto[];
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

export function useConceptionAdminData(
  initialData?: ConceptionAdminInitialData,
  initialError: string | null = null
) {
  const [state, setState] = useState<State>({
    overview: initialData?.overview ?? null,
    alerts: initialData?.alerts ?? [],
    resolvedAlerts: initialData?.resolvedAlerts ?? [],
    recommendations: initialData?.recommendations ?? [],
    vitrinaRecommendations: initialData?.vitrinaRecommendations ?? [],
    loading: !initialData,
    error: initialError,
    analyzeBusy: false,
    analyzeMessage: null,
    actionMessage: null,
  });

  const load = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    if (!background) {
      setState((s) => ({ ...s, loading: true, error: null }));
    }
    try {
      const [overviewRes, alertsRes, recommendationsRes, vitrinaRes] = await Promise.all([
        fetch("/api/admin/conception/overview", fetchOptions),
        fetch("/api/admin/conception/alerts", fetchOptions),
        fetch("/api/admin/conception/recommendations", fetchOptions),
        fetch("/api/admin/conception/vitrina-recommendations", fetchOptions),
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

      let vitrinaRecommendations: VitrinaProductMarketingRecommendation[] | null = null;
      try {
        const v = await readJsonResponse<{
          error?: string;
          message?: string;
          recommendations?: VitrinaProductMarketingRecommendation[];
        }>(vitrinaRes, "Vitrina recommendations API");
        if (v.error) throw new Error(v.message || v.error);
        vitrinaRecommendations = (v.recommendations ?? []) as VitrinaProductMarketingRecommendation[];
      } catch (vitrinaError) {
        if (!background) throw vitrinaError;
      }

      if (o.error) throw new Error(o.message || o.error);
      if (a.error) throw new Error(a.message || a.error);
      if (r.error) throw new Error(r.message || r.error);

      setState((s) => ({
        ...s,
        overview: o.overview as ConceptionOverviewDto,
        alerts: (a.alerts ?? []) as ConceptionAlertDto[],
        resolvedAlerts: (a.resolvedAlerts ?? []) as ConceptionResolvedAlertDto[],
        recommendations: (r.recommendations ?? []) as ConceptionRecommendationDto[],
        vitrinaRecommendations: vitrinaRecommendations ?? s.vitrinaRecommendations,
        loading: false,
        error: background ? s.error : null,
      }));
    } catch (e) {
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

  const refreshLive = useCallback(() => load({ background: true }), [load]);
  useLiveDataRefresh(refreshLive);

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

  const runAnalyze = useCallback(async () => {
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
        llmUsed?: boolean;
        llmSummary?: string;
        llmError?: string;
        llmModel?: string;
        vitrinaRecommendations?: VitrinaProductMarketingRecommendation[];
      }>(res, "Analyze API");
      if (!res.ok) throw new Error(body.message || body.error || "Analyze failed");
      const insertedAlerts = Number(body.insertedAlerts ?? 0);
      const insertedRecommendations = Number(body.insertedRecommendations ?? 0);
      const llmUsed = Boolean(body.llmUsed);
      const llmSummary = typeof body.llmSummary === "string" ? body.llmSummary : null;
      const llmError = typeof body.llmError === "string" ? body.llmError : null;
      const llmModel = typeof body.llmModel === "string" ? body.llmModel : null;
      const vitrinaRecommendations = Array.isArray(body.vitrinaRecommendations) ?
        (body.vitrinaRecommendations as VitrinaProductMarketingRecommendation[])
      : [];

      let analyzeMessage = `Analysis complete — ${insertedAlerts} alert(s), ${insertedRecommendations} recommendation(s), ${vitrinaRecommendations.length} storefront recommendation(s).`;
      if (llmUsed && llmSummary) {
        analyzeMessage = `${analyzeMessage} AI summary (${llmModel ?? "LLM"}): ${llmSummary}`;
      } else if (llmError) {
        const needsOpenRouterCredits = llmError.includes("402") || /insufficient credits/i.test(llmError);
        const geminiQuotaExceeded = /Gemini.*\(429\)|quota exceeded/i.test(llmError);
        const openRouterOnlyFailure = /OpenRouter\s*:/i.test(llmError) && !/Gemini\s*:/i.test(llmError);

        if (needsOpenRouterCredits) {
          analyzeMessage = `${analyzeMessage} OpenRouter has no credits. Top up the account or enable Gemini fallback.`;
        } else if (geminiQuotaExceeded && openRouterOnlyFailure) {
          analyzeMessage = `${analyzeMessage} The free Gemini quota is exceeded. Use OpenRouter with credits or wait for the Google quota reset.`;
        } else if (openRouterOnlyFailure) {
          analyzeMessage = `${analyzeMessage} ${llmError}`;
        } else {
          analyzeMessage = `${analyzeMessage} AI analysis unavailable: ${llmError}`;
        }
      } else if (!llmUsed) {
        analyzeMessage = `${analyzeMessage} Set OPENROUTER_API_KEY or GOOGLE_API_KEY to enable AI analysis.`;
      }

      setState((s) => ({
        ...s,
        analyzeBusy: false,
        analyzeMessage,
        vitrinaRecommendations,
      }));
      await load({ background: true });
    } catch (e) {
      setState((s) => ({
        ...s,
        analyzeBusy: false,
        analyzeMessage: e instanceof Error ? e.message : String(e),
      }));
    }
  }, [load]);

  return { ...state, refresh: load, runAnalyze, dismissAlert, dismissRecommendation };
}
