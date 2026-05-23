export type ConceptionKpiRow = {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
};

export type ConceptionFunnelStep = {
  title: string;
  count: number;
  countLabel: string;
  fromPrevLabel: string;
  overallLabel: string;
  abandonLabel: string | null;
  barPct: number;
};

export type ConceptionFunnelSummary = {
  label: string;
  value: string;
  sub: string;
  subTone: "emerald" | "amber" | "rose";
};

export type ConceptionFrictionItem = {
  priority: string;
  priorityClass: string;
  title: string;
  body: string;
  reco: string;
};

export type ConceptionTopPage = {
  page: string;
  views: number;
  conversions: number;
  ratePct: number;
};

export type ConceptionDeviceSlice = {
  name: string;
  pct: number;
  color: string;
};

export type ConceptionSecurityKpi = {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
};

export type ConceptionSecurityThreatSlice = {
  label: string;
  count: number;
  pct: number;
};

export type ConceptionSecurityQuickFixId = "block_session" | "unblock_session";

export type ConceptionSecurityQuickFixOption = {
  id: ConceptionSecurityQuickFixId;
  label: string;
  summary: string;
};

export type ConceptionSecurityIncident = {
  id: string;
  sessionKey: string;
  displayIdentity: string;
  status: "blocked" | "monitoring" | "flagged";
  statusLabel: string;
  statusTone: "risk" | "attention" | "guidance";
  category: string;
  riskScore: number;
  title: string;
  detail: string;
  location: string;
  detectedAt: string;
  timeAgoLabel: string;
  quickFixes: ConceptionSecurityQuickFixOption[];
};

export type ConceptionSecurityBlockedIdentity = {
  id: string;
  sessionKey: string;
  displayIdentity: string;
  reason: string;
  blockedRequests: number;
  blockedAt: string;
  blockedAgoLabel: string;
  quickFixes: ConceptionSecurityQuickFixOption[];
};

export type ConceptionSecurityBrief = {
  suspiciousSessions7d: number;
  highVelocitySessions: number;
  notes: string[];
  score: number;
  scoreMax: number;
  scoreDeltaVsPreviousPeriod: number;
  kpis: ConceptionSecurityKpi[];
  threatActivity24h: number[];
  threatTypes7d: ConceptionSecurityThreatSlice[];
  incidents: ConceptionSecurityIncident[];
  blockedIdentities: ConceptionSecurityBlockedIdentity[];
  computedAt: string;
};

export type ConceptionTrafficSourceSlice = {
  label: string;
  sessions: number;
  ratePct: number;
};

export type ConceptionScrollDepthRow = {
  label: string;
  sessions: number;
  sessionsLabel: string;
  pct: number;
};

export type ConceptionHeatmapBand = {
  label: string;
  intensityPct: number;
};

export type ConceptionSessionReplay = {
  id: string;
  durationLabel: string;
  device: string;
  status: string;
};

export type ConceptionUserBehaviorBrief = {
  trafficSources: ConceptionTrafficSourceSlice[];
  heatmapBands: ConceptionHeatmapBand[];
  scrollDepth: ConceptionScrollDepthRow[];
  scrollInsight: string | null;
  scrollRecommendation: string | null;
  sessionReplays: ConceptionSessionReplay[];
  productPageLabel: string | null;
};

export type ConceptionAlertRuleKey =
  | "CONVERSION_DROP"
  | "TRAFFIC_SPIKE"
  | "CART_ABANDON_MASS"
  | "JS_ERROR_BURST"
  | "PERF_SLOW";

export type ConceptionAlertRule = {
  key: ConceptionAlertRuleKey;
  name: string;
  condition: string;
  enabled: boolean;
};

export type ConceptionAlertRuleSettings = {
  CONVERSION_DROP: {
    enabled: boolean;
    /** Fire when current rate < reference × this ratio (default 0.8 = 20% drop). */
    dropRatioThreshold: number;
    minReferenceRate: number;
  };
  TRAFFIC_SPIKE: {
    enabled: boolean;
    /** Fire when 15m events exceed baseline × this multiplier. */
    spikeMultiplier: number;
  };
  CART_ABANDON_MASS: {
    enabled: boolean;
    minCartSessions: number;
    /** 0–1 cart abandonment rate threshold. */
    abandonRateThreshold: number;
  };
  JS_ERROR_BURST: {
    enabled: boolean;
    /** 0–1 share of checkout sessions with pa_js_error. */
    errorRateThreshold: number;
  };
  PERF_SLOW: {
    enabled: boolean;
    minSlowSessions: number;
  };
};

export type ConceptionResolvedAlertDto = {
  id: string;
  alertType: string;
  title: string;
  description: string;
  detail: string | null;
  dismissedAt: string;
  createdAt: string;
};

export type ConceptionOverviewDto = {
  source: "live" | "empty";
  hasEventData: boolean;
  windowDays: number;
  kpis: ConceptionKpiRow[];
  funnelSteps: ConceptionFunnelStep[];
  funnelSummary: ConceptionFunnelSummary[];
  frictionItems: ConceptionFrictionItem[];
  topPages: ConceptionTopPage[];
  devices: ConceptionDeviceSlice[];
  trafficHourlyNormalized: number[];
  activeVisitors15m: number;
  totalEvents7d: number;
  security: ConceptionSecurityBrief;
  userBehavior: ConceptionUserBehaviorBrief;
  alertRules: ConceptionAlertRule[];
  computedAt: string;
};

export type ConceptionAlertDto = {
  id: string;
  alertType: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  detail: string | null;
  affectedSessionsEstimate: number | null;
  createdAt: string;
};

export type ConceptionAlertDetailIndicator = {
  label: string;
  value: string;
  note?: string;
};

export type ConceptionAlertDetailDeviation = {
  label: string;
  value: string;
  baseline: string;
  tone: "critical" | "high" | "medium" | "low";
};

export type ConceptionAlertDetailAnalysisDto = {
  alertId: string;
  alertType: string;
  summary: string;
  indicators: ConceptionAlertDetailIndicator[];
  deviations: ConceptionAlertDetailDeviation[];
  clues: string[];
  fixSteps: string[];
  computedAt: string;
  llmEnhanced: boolean;
};

export type RecommendationWorkflowStatus = "active" | "inbox" | "implemented";

export type ConceptionRecommendationDto = {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  priorityLabel: string;
  impactLabel: string | null;
  title: string;
  analysis: string;
  recommendation: string;
  confidence: number;
  revenueHint: string | null;
  implementationHint: string | null;
  roiHint: string | null;
  assignedRoleKey: string;
  assignedRoleLabel: string;
  roleEmailConfigured: boolean;
  workflowStatus: RecommendationWorkflowStatus;
  inboxAt: string | null;
  emailSentAt: string | null;
  createdAt: string;
};

export type RecommendationRoleEmailDto = {
  roleKey: string;
  displayName: string;
  email: string;
  updatedAt: string;
};
