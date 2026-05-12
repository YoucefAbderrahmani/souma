import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { conceptionSecurityBlockTable, salesMicroEventTable } from "@/server/db/schema";
import { PA_JS_ERROR, STORE_EVENT } from "@/server/conception/event-contract";
import type {
  ConceptionSecurityBlockedIdentity,
  ConceptionSecurityBrief,
  ConceptionSecurityIncident,
  ConceptionSecurityKpi,
  ConceptionSecurityQuickFixOption,
  ConceptionSecurityThreatSlice,
} from "@/types/conception-admin";

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;

type SessionRiskRow = {
  session_key: string;
  events: number;
  product_views: number;
  clicks: number;
  hovers: number;
  checkouts: number;
  js_errors: number;
  duration_s: number;
  last_seen: Date | string;
  has_product_view: boolean;
};

type ThreatCounts = {
  botScraping: number;
  clickFraud: number;
  fakeCheckout: number;
  jsErrors: number;
};

function fmtInt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function fmtPct(p: number, digits = 0): string {
  if (!Number.isFinite(p)) return "0%";
  return `${p.toFixed(digits)}%`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function maskSessionKey(sessionKey: string) {
  const safe = sessionKey.trim();
  if (safe.length <= 12) return safe;
  return `${safe.slice(0, 8)}…${safe.slice(-4)}`;
}

function formatDelta(current: number, previous: number) {
  if (previous <= 0) {
    return {
      label: current > 0 ? "+100% vs période précédente" : "0% vs période précédente",
      positive: current <= 0,
    };
  }
  const delta = ((current - previous) / previous) * 100;
  return {
    label: `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs période précédente`,
    positive: delta <= 0,
  };
}

function formatTimeAgoFr(value: Date | string, base = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = date.getTime() - base.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) {
    return new Intl.RelativeTimeFormat("fr", { numeric: "auto" }).format(minutes, "minute");
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) {
    return new Intl.RelativeTimeFormat("fr", { numeric: "auto" }).format(hours, "hour");
  }
  const days = Math.round(hours / 24);
  return new Intl.RelativeTimeFormat("fr", { numeric: "auto" }).format(days, "day");
}

function classifySession(row: SessionRiskRow): ThreatCounts & { categories: string[] } {
  const categories: string[] = [];
  const counts: ThreatCounts = {
    botScraping: 0,
    clickFraud: 0,
    fakeCheckout: 0,
    jsErrors: 0,
  };

  const highVelocity = row.events >= 50 && row.duration_s > 0 && row.duration_s <= 360;
  const scraping = row.product_views >= 25 && row.duration_s > 0 && row.duration_s <= 600;
  const clickFraud = row.clicks >= 35 && row.duration_s > 0 && row.duration_s <= 300;
  const fakeCheckout = row.checkouts > 0 && !row.has_product_view;
  const jsErrors = row.js_errors >= 3;

  if (highVelocity || scraping) {
    categories.push("Bot scraping");
    counts.botScraping = 1;
  }
  if (clickFraud) {
    categories.push("Click fraud");
    counts.clickFraud = 1;
  }
  if (fakeCheckout) {
    categories.push("Fausses commandes");
    counts.fakeCheckout = 1;
  }
  if (jsErrors) {
    categories.push("Erreurs JS");
    counts.jsErrors = 1;
  }

  return { ...counts, categories };
}

function riskScore(row: SessionRiskRow) {
  const classified = classifySession(row);
  let score = 0;
  if (row.events >= 50 && row.duration_s > 0 && row.duration_s <= 360) score += 40;
  if (row.product_views >= 25 && row.duration_s > 0 && row.duration_s <= 600) score += 25;
  if (row.clicks >= 35 && row.duration_s > 0 && row.duration_s <= 300) score += 20;
  if (classified.fakeCheckout > 0) score += 15;
  if (row.js_errors >= 3) score += 10;
  if (row.hovers <= 1 && row.clicks >= 10) score += 8;
  return clamp(score, 0, 100);
}

function computeSecurityScore(input: {
  totalSessions: number;
  bots: number;
  blocked: number;
  fraud: number;
  hourlyPeak: number;
}) {
  const sessionBase = Math.max(10, input.totalSessions);
  const botPressure = Math.min(30, (input.bots / sessionBase) * 100 * 0.35);
  const blockPressure = Math.min(18, (input.blocked / sessionBase) * 100 * 0.2);
  const fraudPressure = Math.min(24, input.fraud * 4);
  const peakPressure = Math.min(16, (input.hourlyPeak / 80) * 16);
  const score = 100 - botPressure - blockPressure - fraudPressure - peakPressure;
  return Math.round(clamp(score, 0, 100));
}

const SCORE_FORMULA =
  "Score = 100 − min(30, bots/sessions×35) − min(18, blocages/sessions×20) − min(24, fraudes×4) − min(16, pic horaire/80×16), borné entre 0 et 100.";

function buildQuickFixes(isBlocked: boolean): ConceptionSecurityQuickFixOption[] {
  if (isBlocked) {
    return [
      {
        id: "unblock_session",
        label: "Débloquer la session",
        summary: "Retire la session de la liste noire et autorise à nouveau la collecte.",
      },
    ];
  }
  return [
    {
      id: "block_session",
      label: "Bloquer la session",
      summary: "Ajoute la session à la liste noire et ignore les prochains événements.",
    },
  ];
}

function incidentStatus(score: number, isBlocked: boolean): {
  status: ConceptionSecurityIncident["status"];
  statusLabel: string;
  tone: ConceptionSecurityIncident["statusTone"];
} {
  if (isBlocked || score >= 90) {
    return { status: "blocked", statusLabel: "BLOQUÉ", tone: "risk" };
  }
  if (score >= 70) {
    return { status: "monitoring", statusLabel: "SURVEILLANCE", tone: "attention" };
  }
  return { status: "flagged", statusLabel: "SIGNALÉ", tone: "guidance" };
}

function incidentTitle(row: SessionRiskRow, categories: string[]) {
  if (categories.includes("Bot scraping")) {
    return `Visite de ${fmtInt(row.product_views)} pages produits en ${Math.max(1, Math.round(row.duration_s / 60))} minute(s)`;
  }
  if (categories.includes("Click fraud")) {
    return `Clics massifs détectés sur la session (${fmtInt(row.clicks)} clics)`;
  }
  if (categories.includes("Fausses commandes")) {
    return "Checkout sans parcours produit détecté";
  }
  if (categories.includes("Erreurs JS")) {
    return `Erreurs JavaScript répétées (${fmtInt(row.js_errors)} signaux)`;
  }
  return `Densité d'événements anormale (${fmtInt(row.events)} événements)`;
}

function incidentDetail(row: SessionRiskRow, categories: string[]) {
  if (categories.includes("Bot scraping")) {
    const dwell = row.product_views > 0 ? (row.duration_s / row.product_views).toFixed(1) : "0.0";
    return `Temps moyen de ${dwell}s par page produit, ${row.hovers} survol(s) enregistré(s).`;
  }
  if (categories.includes("Click fraud")) {
    return `${fmtInt(row.clicks)} clics en ${Math.max(1, Math.round(row.duration_s / 60))} minute(s), pattern répétitif détecté.`;
  }
  if (categories.includes("Fausses commandes")) {
    return "Checkout déclenché sans vue produit dans la même session.";
  }
  if (categories.includes("Erreurs JS")) {
    return "Erreurs client répétées sur les pages sensibles.";
  }
  return `${fmtInt(row.events)} événements en ${Math.max(1, Math.round(row.duration_s))} seconde(s).`;
}

async function loadSessionRows(since: Date, until?: Date): Promise<SessionRiskRow[]> {
  const result =
    until ?
      await db.execute(sql`
        SELECT
          session_key,
          COUNT(*)::int AS events,
          COUNT(*) FILTER (WHERE event_name = ${STORE_EVENT.productView})::int AS product_views,
          COUNT(*) FILTER (WHERE event_name = 'pa_pointer_click')::int AS clicks,
          COUNT(*) FILTER (WHERE event_name = 'pa_pointer_hover')::int AS hovers,
          COUNT(*) FILTER (WHERE event_name = ${STORE_EVENT.beginCheckout})::int AS checkouts,
          COUNT(*) FILTER (WHERE event_name = ${PA_JS_ERROR})::int AS js_errors,
          GREATEST(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))), 0)::float AS duration_s,
          MAX(created_at) AS last_seen,
          BOOL_OR(event_name = ${STORE_EVENT.productView}) AS has_product_view
        FROM sales_micro_event
        WHERE created_at >= ${since}
          AND created_at < ${until}
        GROUP BY session_key
      `)
    : await db.execute(sql`
        SELECT
          session_key,
          COUNT(*)::int AS events,
          COUNT(*) FILTER (WHERE event_name = ${STORE_EVENT.productView})::int AS product_views,
          COUNT(*) FILTER (WHERE event_name = 'pa_pointer_click')::int AS clicks,
          COUNT(*) FILTER (WHERE event_name = 'pa_pointer_hover')::int AS hovers,
          COUNT(*) FILTER (WHERE event_name = ${STORE_EVENT.beginCheckout})::int AS checkouts,
          COUNT(*) FILTER (WHERE event_name = ${PA_JS_ERROR})::int AS js_errors,
          GREATEST(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))), 0)::float AS duration_s,
          MAX(created_at) AS last_seen,
          BOOL_OR(event_name = ${STORE_EVENT.productView}) AS has_product_view
        FROM sales_micro_event
        WHERE created_at >= ${since}
        GROUP BY session_key
      `);

  return (result.rows as Array<Record<string, unknown>>).map((row) => ({
    session_key: String(row.session_key ?? ""),
    events: Number(row.events ?? 0),
    product_views: Number(row.product_views ?? 0),
    clicks: Number(row.clicks ?? 0),
    hovers: Number(row.hovers ?? 0),
    checkouts: Number(row.checkouts ?? 0),
    js_errors: Number(row.js_errors ?? 0),
    duration_s: Number(row.duration_s ?? 0),
    last_seen: row.last_seen instanceof Date ? row.last_seen : String(row.last_seen ?? new Date().toISOString()),
    has_product_view: Boolean(row.has_product_view),
  }));
}

async function loadThreatActivity24h(since24h: Date, riskySessionKeys: string[]) {
  const series = Array.from({ length: 24 }, () => 0);
  if (riskySessionKeys.length === 0) return series;

  const result = await db.execute(sql`
    SELECT
      date_trunc('hour', created_at) AS bucket,
      COUNT(*)::int AS events
    FROM sales_micro_event
    WHERE created_at >= ${since24h}
      AND session_key IN (${sql.join(
        riskySessionKeys.map((key) => sql`${key}`),
        sql`, `
      )})
    GROUP BY 1
    ORDER BY 1
  `);

  const now = Date.now();
  for (const row of result.rows as Array<{ bucket: Date | string; events: unknown }>) {
    const bucket = row.bucket instanceof Date ? row.bucket : new Date(row.bucket);
    const ageHours = Math.floor((now - bucket.getTime()) / MS_HOUR);
    const index = 23 - ageHours;
    if (index >= 0 && index < 24) {
      series[index] = Number(row.events ?? 0);
    }
  }

  return series;
}

async function loadActiveBlocks() {
  const rows = await db
    .select({
      sessionKey: conceptionSecurityBlockTable.sessionKey,
      reason: conceptionSecurityBlockTable.reason,
      blockedAt: conceptionSecurityBlockTable.blockedAt,
    })
    .from(conceptionSecurityBlockTable)
    .where(isNull(conceptionSecurityBlockTable.liftedAt));

  return rows;
}

async function countBlockedRequests(sessionKey: string, since: Date) {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(salesMicroEventTable)
    .where(and(eq(salesMicroEventTable.sessionKey, sessionKey), gte(salesMicroEventTable.createdAt, since)));
  return Number(row?.count ?? 0);
}

export async function buildConceptionSecurityBrief(windowDays = 7): Promise<ConceptionSecurityBrief> {
  const now = Date.now();
  const since = new Date(now - windowDays * MS_DAY);
  const prevSince = new Date(now - windowDays * 2 * MS_DAY);
  const since24h = new Date(now - 24 * MS_HOUR);

  const [currentRows, previousRows, activeBlocks] = await Promise.all([
    loadSessionRows(since),
    loadSessionRows(prevSince, since),
    loadActiveBlocks(),
  ]);

  const blockedKeys = new Set(activeBlocks.map((row) => row.sessionKey));

  const currentThreats = currentRows.map((row) => ({
    row,
    classified: classifySession(row),
    score: riskScore(row),
  }));

  const riskyRows = currentThreats.filter(
    (item) => item.score >= 50 || item.classified.categories.length > 0 || blockedKeys.has(item.row.session_key)
  );

  const botsDetected = currentThreats.filter(
    (item) =>
      (item.row.events >= 50 && item.row.duration_s > 0 && item.row.duration_s <= 360) ||
      item.classified.botScraping > 0
  ).length;

  const fraudAttempts = currentThreats.filter(
    (item) => item.classified.fakeCheckout > 0 || item.classified.clickFraud > 0
  ).length;

  const blockedIdentitiesCount = activeBlocks.length;

  const threatActivity24h = await loadThreatActivity24h(
    since24h,
    riskyRows.map((item) => item.row.session_key)
  );
  const hourlyPeak = Math.max(0, ...threatActivity24h);

  const score = computeSecurityScore({
    totalSessions: Math.max(1, currentRows.length),
    bots: botsDetected,
    blocked: blockedIdentitiesCount,
    fraud: fraudAttempts,
    hourlyPeak,
  });

  const previousBots = previousRows.filter(
    (row) => (row.events >= 50 && row.duration_s > 0 && row.duration_s <= 360) || row.product_views >= 25
  ).length;
  const previousFraud = previousRows.filter(
    (row) => row.checkouts > 0 && !row.has_product_view
  ).length;
  const previousBlocked = previousRows.filter((row) => riskScore(row) >= 90).length;
  const previousScore = computeSecurityScore({
    totalSessions: Math.max(1, previousRows.length),
    bots: previousBots,
    blocked: previousBlocked,
    fraud: previousFraud,
    hourlyPeak: Math.max(0, ...threatActivity24h) * 0.6,
  });

  const threatTotals: ThreatCounts = { botScraping: 0, clickFraud: 0, fakeCheckout: 0, jsErrors: 0 };
  for (const item of currentThreats) {
    threatTotals.botScraping += item.classified.botScraping;
    threatTotals.clickFraud += item.classified.clickFraud;
    threatTotals.fakeCheckout += item.classified.fakeCheckout;
    threatTotals.jsErrors += item.classified.jsErrors;
  }
  const threatSum =
    threatTotals.botScraping +
    threatTotals.clickFraud +
    threatTotals.fakeCheckout +
    threatTotals.jsErrors;
  const threatTypes7d: ConceptionSecurityThreatSlice[] = [
    { label: "Bot scraping", count: threatTotals.botScraping, pct: 0 },
    { label: "Click fraud", count: threatTotals.clickFraud, pct: 0 },
    { label: "Fausses commandes", count: threatTotals.fakeCheckout, pct: 0 },
    { label: "Erreurs JS", count: threatTotals.jsErrors, pct: 0 },
  ].map((slice) => ({
    ...slice,
    pct: threatSum > 0 ? Math.round((slice.count / threatSum) * 100) : 0,
  }));

  const botsDelta = formatDelta(botsDetected, previousBots);
  const blockedDelta = formatDelta(blockedIdentitiesCount, previousBlocked);
  const fraudDelta = formatDelta(fraudAttempts, previousFraud);
  const scoreDelta = score - previousScore;

  const kpis: ConceptionSecurityKpi[] = [
    {
      label: "Bots détectés",
      value: fmtInt(botsDetected),
      delta: botsDelta.label,
      deltaPositive: botsDelta.positive,
    },
    {
      label: "Sessions bloquées",
      value: fmtInt(blockedIdentitiesCount),
      delta: blockedDelta.label,
      deltaPositive: blockedDelta.positive,
    },
    {
      label: "Tentatives de fraude",
      value: fmtInt(fraudAttempts),
      delta: fraudDelta.label,
      deltaPositive: fraudDelta.positive,
    },
    {
      label: "Score de sécurité",
      value: `${score}/100`,
      delta: `${scoreDelta >= 0 ? "+" : ""}${scoreDelta} vs période précédente`,
      deltaPositive: scoreDelta >= 0,
    },
  ];

  const incidents: ConceptionSecurityIncident[] = riskyRows
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((item, index) => {
      const isBlocked = blockedKeys.has(item.row.session_key);
      const status = incidentStatus(item.score, isBlocked);
      const category = item.classified.categories[0] ?? "Activité suspecte";
      return {
        id: `security-incident-${item.row.session_key}-${index}`,
        sessionKey: item.row.session_key,
        displayIdentity: maskSessionKey(item.row.session_key),
        status: status.status,
        statusLabel: status.statusLabel,
        statusTone: status.tone,
        category,
        riskScore: item.score,
        title: incidentTitle(item.row, item.classified.categories),
        detail: incidentDetail(item.row, item.classified.categories),
        location: "Inconnu",
        detectedAt:
          item.row.last_seen instanceof Date ?
            item.row.last_seen.toISOString()
          : new Date(item.row.last_seen).toISOString(),
        timeAgoLabel: formatTimeAgoFr(item.row.last_seen),
        quickFixes: buildQuickFixes(isBlocked),
      };
    });

  const blockedRows = await Promise.all(
    activeBlocks.map(async (row) => ({
      row,
      blockedRequests: await countBlockedRequests(row.sessionKey, since),
    }))
  );

  const blockedIdentities: ConceptionSecurityBlockedIdentity[] = blockedRows
    .sort((left, right) => right.blockedRequests - left.blockedRequests)
    .map((item) => ({
      id: `security-block-${item.row.sessionKey}`,
      sessionKey: item.row.sessionKey,
      displayIdentity: maskSessionKey(item.row.sessionKey),
      reason: item.row.reason,
      blockedRequests: item.blockedRequests,
      blockedAt: item.row.blockedAt.toISOString(),
      blockedAgoLabel: formatTimeAgoFr(item.row.blockedAt),
      quickFixes: buildQuickFixes(true),
    }));

  const notes: string[] = [];
  if (botsDetected > 0) {
    notes.push(
      `${fmtInt(botsDetected)} session(s) présentent une densité d'événements compatible avec un bot ou un scraping.`
    );
  } else {
    notes.push("Aucune session à haute vélocité détectée sur la fenêtre courante.");
  }
  if (fraudAttempts > 0) {
    notes.push(
      `${fmtInt(fraudAttempts)} session(s) montrent des signaux de fraude (clics massifs ou checkout anormal).`
    );
  }
  if (blockedIdentitiesCount > 0) {
    notes.push(`${fmtInt(blockedIdentitiesCount)} identité(s) client sont actuellement bloquées.`);
  }
  notes.push("Les identités client sont dérivées des clés de session — aucune adresse IP n'est stockée dans les micro-événements.");

  return {
    suspiciousSessions7d: riskyRows.length,
    highVelocitySessions: botsDetected,
    notes,
    score,
    scoreMax: 100,
    scoreFormula: SCORE_FORMULA,
    scoreDeltaVsPreviousPeriod: scoreDelta,
    kpis,
    threatActivity24h,
    threatTypes7d,
    incidents,
    blockedIdentities,
    computedAt: new Date().toISOString(),
  };
}
