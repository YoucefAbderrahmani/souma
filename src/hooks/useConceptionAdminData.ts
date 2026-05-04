"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ConceptionAlertDto,
  ConceptionOverviewDto,
  ConceptionRecommendationDto,
} from "@/types/conception-admin";

type State = {
  overview: ConceptionOverviewDto | null;
  alerts: ConceptionAlertDto[];
  recommendations: ConceptionRecommendationDto[];
  loading: boolean;
  error: string | null;
  analyzeBusy: boolean;
  analyzeMessage: string | null;
};

export function useConceptionAdminData() {
  const [state, setState] = useState<State>({
    overview: null,
    alerts: [],
    recommendations: [],
    loading: true,
    error: null,
    analyzeBusy: false,
    analyzeMessage: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [o, a, r] = await Promise.all([
        fetch("/api/admin/conception/overview", { credentials: "include" }).then((x) => x.json()),
        fetch("/api/admin/conception/alerts", { credentials: "include" }).then((x) => x.json()),
        fetch("/api/admin/conception/recommendations", { credentials: "include" }).then((x) => x.json()),
      ]);
      if (o.error) throw new Error(o.message || o.error);
      if (a.error) throw new Error(a.message || a.error);
      if (r.error) throw new Error(r.message || r.error);
      setState((s) => ({
        ...s,
        overview: o.overview as ConceptionOverviewDto,
        alerts: (a.alerts ?? []) as ConceptionAlertDto[],
        recommendations: (r.recommendations ?? []) as ConceptionRecommendationDto[],
        loading: false,
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAnalyze = useCallback(async () => {
    setState((s) => ({ ...s, analyzeBusy: true, analyzeMessage: null }));
    try {
      const res = await fetch("/api/admin/conception/analyze", {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || body.error || "Analyze failed");
      setState((s) => ({
        ...s,
        analyzeBusy: false,
        analyzeMessage: `Analyse terminée — ${body.insertedAlerts ?? 0} alerte(s), ${body.insertedRecommendations ?? 0} recommandation(s).`,
      }));
      await load();
    } catch (e) {
      setState((s) => ({
        ...s,
        analyzeBusy: false,
        analyzeMessage: e instanceof Error ? e.message : String(e),
      }));
    }
  }, [load]);

  return { ...state, refresh: load, runAnalyze };
}
