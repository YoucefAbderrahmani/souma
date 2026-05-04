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

export type ConceptionSecurityBrief = {
  suspiciousSessions7d: number;
  highVelocitySessions: number;
  notes: string[];
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

export type ConceptionRecommendationDto = {
  id: string;
  priority: "high" | "medium" | "low";
  priorityLabel: string;
  impactLabel: string | null;
  title: string;
  analysis: string;
  recommendation: string;
  confidence: number;
  revenueHint: string | null;
  implementationHint: string | null;
  roiHint: string | null;
  createdAt: string;
};
