import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { salesMicroEventTable } from "@/server/db/schema";
import { getConceptionAlertRuleSettings, settingsToAlertRules } from "@/server/conception/alert-rule-settings";
import { buildConceptionSecurityBrief } from "@/server/conception/security-intel";
import { funnelCounts } from "@/server/conception/funnel-metrics";
import { classifyTrafficSource, mergePinnedTrafficSources } from "@/lib/classify-traffic-source";
import { PA_JS_ERROR, STORE_EVENT } from "@/server/conception/event-contract";
import type {
  ConceptionDeviceSlice,
  ConceptionFrictionItem,
  ConceptionFunnelStep,
  ConceptionFunnelSummary,
  ConceptionKpiRow,
  ConceptionOverviewDto,
  ConceptionSecurityBrief,
  ConceptionTopPage,
  ConceptionUserBehaviorBrief,
} from "@/types/conception-admin";

const MS_DAY = 86_400_000;

function fmtInt(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function fmtPct(p: number, digits = 1): string {
  if (!Number.isFinite(p)) return "0%";
  return `${p.toFixed(digits)}%`;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

async function scalarInt(q: Promise<{ n: number }[]>): Promise<number> {
  const rows = await q;
  const v = rows[0];
  const n = v?.n;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

async function distinctSessionsSince(since: Date): Promise<number> {
  return scalarInt(
    db
      .select({
        n: sql<number>`count(distinct ${salesMicroEventTable.sessionKey})::int`.as("n"),
      })
      .from(salesMicroEventTable)
      .where(gte(salesMicroEventTable.createdAt, since))
  );
}

async function totalEventsSince(since: Date): Promise<number> {
  return scalarInt(
    db
      .select({ n: sql<number>`count(*)::int`.as("n") })
      .from(salesMicroEventTable)
      .where(gte(salesMicroEventTable.createdAt, since))
  );
}

async function distinctSessionsBetween(start: Date, end: Date): Promise<number> {
  return scalarInt(
    db
      .select({
        n: sql<number>`count(distinct ${salesMicroEventTable.sessionKey})::int`.as("n"),
      })
      .from(salesMicroEventTable)
      .where(and(gte(salesMicroEventTable.createdAt, start), lt(salesMicroEventTable.createdAt, end)))
  );
}

async function trafficHourlyNormalized(since: Date): Promise<number[]> {
  const rows = await db
    .select({
      bucket: sql<string>`date_trunc('hour', ${salesMicroEventTable.createdAt})`.as("bucket"),
      cnt: sql<number>`count(*)::int`.as("cnt"),
    })
    .from(salesMicroEventTable)
    .where(gte(salesMicroEventTable.createdAt, since))
    .groupBy(sql`date_trunc('hour', ${salesMicroEventTable.createdAt})`)
    .orderBy(sql`date_trunc('hour', ${salesMicroEventTable.createdAt})`);

  if (rows.length === 0) {
    return Array.from({ length: 24 }, () => 0);
  }

  const counts = rows.map((r) => r.cnt);
  const max = Math.max(1, ...counts);
  const normalized = rows.map((r) => clamp01(r.cnt / max));
  if (normalized.length >= 24) {
    return normalized.slice(-24);
  }
  return [...Array.from({ length: 24 - normalized.length }, () => 0), ...normalized];
}

async function topPagesByVolume(since: Date, limit: number): Promise<ConceptionTopPage[]> {
  const viewRows = await db
    .select({
      page: salesMicroEventTable.pagePath,
      views: sql<number>`count(*)::int`.as("views"),
    })
    .from(salesMicroEventTable)
    .where(gte(salesMicroEventTable.createdAt, since))
    .groupBy(salesMicroEventTable.pagePath)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  const convRows = await db
    .select({
      page: salesMicroEventTable.pagePath,
      conversions: sql<number>`count(*)::int`.as("conversions"),
    })
    .from(salesMicroEventTable)
    .where(
      and(
        gte(salesMicroEventTable.createdAt, since),
        eq(salesMicroEventTable.eventName, STORE_EVENT.addToCart)
      )
    )
    .groupBy(salesMicroEventTable.pagePath);

  const convByPage = new Map(convRows.map((r) => [r.page, r.conversions]));

  return viewRows.map((r) => {
    const conversions = convByPage.get(r.page) ?? 0;
    const ratePct = r.views > 0 ? (100 * conversions) / r.views : 0;
    return { page: r.page, views: r.views, conversions, ratePct };
  });
}

async function deviceSlices(since: Date): Promise<ConceptionDeviceSlice[]> {
  const [row] = await db
    .select({
      mobile: sql<number>`count(*) filter (where coalesce(${salesMicroEventTable.payloadJson}::jsonb->>'device','') = 'mobile')::int`.as(
        "mobile"
      ),
      tablet: sql<number>`count(*) filter (where coalesce(${salesMicroEventTable.payloadJson}::jsonb->>'device','') = 'tablet')::int`.as(
        "tablet"
      ),
      total: sql<number>`count(*)::int`.as("total"),
    })
    .from(salesMicroEventTable)
    .where(
      and(
        gte(salesMicroEventTable.createdAt, since),
        eq(salesMicroEventTable.eventName, STORE_EVENT.globalContext)
      )
    );

  const tot = row?.total ?? 0;
  if (tot === 0) {
    return [
      { name: "Mobile", pct: 0, color: "bg-blue" },
      { name: "Desktop", pct: 0, color: "bg-blue" },
      { name: "Tablet", pct: 0, color: "bg-blue" },
    ];
  }
  const mobile = row?.mobile ?? 0;
  const tablet = row?.tablet ?? 0;
  const desktop = Math.max(0, tot - mobile - tablet);
  const pM = (100 * mobile) / tot;
  const pT = (100 * tablet) / tot;
  const pD = Math.max(0, 100 - pM - pT);
  return [
    { name: "Mobile", pct: Math.round(pM), color: "bg-blue" },
    { name: "Desktop", pct: Math.round(pD), color: "bg-blue" },
    { name: "Tablet", pct: Math.round(pT), color: "bg-blue" },
  ];
}

async function securityBrief(since: Date): Promise<ConceptionSecurityBrief> {
  void since;
  return buildConceptionSecurityBrief(7);
}

function buildFunnelSteps(f: {
  nProduct: number;
  nCart: number;
  nCheckoutPath: number;
  nFinal: number;
}): ConceptionFunnelStep[] {
  const entry = f.nProduct;
  const steps: { title: string; n: number }[] = [
    { title: "Product page", n: f.nProduct },
    { title: "Add to cart", n: f.nCart },
    { title: "Checkout started", n: f.nCheckoutPath },
    { title: "Order completed", n: f.nFinal },
  ];

  return steps.map((s, i) => {
    const prevN = i === 0 ? s.n : steps[i - 1]!.n;
    const shareOfProduct = entry > 0 ? Math.min(100, (100 * s.n) / entry) : 0;
    const barPct = i === 0 ? (entry > 0 ? 100 : 0) : shareOfProduct;

    let fromPrevLabel: string;
    if (i === 0) {
      fromPrevLabel = "Baseline";
    } else if (prevN === 0) {
      fromPrevLabel = s.n === 0 ? "Prior step: 0 visits" : "Prior step: 0 visits";
    } else if (s.n > prevN) {
      fromPrevLabel = "More visits than prior step";
    } else {
      fromPrevLabel = `${fmtPct((100 * s.n) / prevN)} continued from prior step`;
    }

    const overallLabel =
      i === 0 ? "100.0% baseline" : (
        entry > 0 ? `${fmtPct(shareOfProduct)} of product visits` : "—"
      );

    const abandonLabel =
      i > 0 && prevN > 0 && s.n < prevN ?
        `${fmtPct((100 * (prevN - s.n)) / prevN)} drop-off from prior step`
      : null;

    return {
      title: s.title,
      count: s.n,
      countLabel: fmtInt(s.n),
      fromPrevLabel,
      overallLabel,
      abandonLabel,
      barPct,
    };
  });
}

function buildFriction(f: {
  nProduct: number;
  nCart: number;
  nCheckoutPath: number;
  nFinal: number;
}): ConceptionFrictionItem[] {
  const items: ConceptionFrictionItem[] = [];
  if (f.nProduct > 0 && f.nCart > 0) {
    const drop = 100 * (1 - f.nCart / f.nProduct);
    if (drop >= 15) {
      items.push({
        priority: "HIGH PRIORITY",
        priorityClass: "border-rose-500/40 bg-rose-500/10 text-rose-200",
        title: "Product page → Cart",
        body: `${fmtPct(drop)} abandonment between product view and purchase intent.`,
        reco: "Strengthen social proof, clarify availability and price, and reduce friction on the primary CTA.",
      });
    }
  }
  if (f.nCart > 0 && f.nCheckoutPath < f.nCart) {
    const drop = 100 * (1 - f.nCheckoutPath / f.nCart);
    if (drop >= 20) {
      items.push({
        priority: "HIGH PRIORITY",
        priorityClass: "border-rose-500/40 bg-rose-500/10 text-rose-200",
        title: "Cart → Checkout",
        body: `${fmtPct(drop)} abandonment — main friction point detected in live data.`,
        reco: "Reduce funnel steps, offer guest checkout, and show shipping costs early.",
      });
    }
  }
  if (f.nCheckoutPath > 0 && f.nFinal <= f.nCheckoutPath) {
    const drop = 100 * (1 - f.nFinal / f.nCheckoutPath);
    if (drop >= 15) {
      items.push({
        priority: "MEDIUM PRIORITY",
        priorityClass: "border-amber-500/40 bg-amber-500/10 text-amber-200",
        title: "Checkout → Completion",
        body: `${fmtPct(drop)} abandonment at the final step (payment return / errors).`,
        reco: "Monitor JS errors (cb_js_error), test the Chargily flow and mobile on the form.",
      });
    }
  }
  if (items.length === 0) {
    items.push({
      priority: "ANALYSIS",
      priorityClass: "border-zinc-600/50 bg-zinc-800/40 text-zinc-300",
      title: "Insufficient volume or healthy funnel",
      body: "No major friction detected in the current window, or not enough data to conclude.",
      reco: "Run a scheduled analysis after traffic builds, and enrich tracking (scroll, hover, errors).",
    });
  }
  return items.slice(0, 4);
}

function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${remainder}s`;
}

function emptyUserBehavior(): ConceptionUserBehaviorBrief {
  return {
    trafficSources: mergePinnedTrafficSources([], 0),
    heatmapBands: [],
    scrollDepth: [],
    scrollInsight: null,
    scrollRecommendation: null,
    sessionReplays: [],
    productPageLabel: null,
  };
}

async function buildUserBehaviorBrief(since: Date): Promise<ConceptionUserBehaviorBrief> {
  const sourceRes = await db.execute(sql`
    SELECT
      session_key,
      (array_agg(referrer ORDER BY created_at ASC)
        FILTER (WHERE referrer IS NOT NULL))[1] AS referrer_first,
      (array_agg(payload_json::jsonb->>'source' ORDER BY created_at ASC)
        FILTER (WHERE event_name = ${STORE_EVENT.globalContext}))[1] AS context_source,
      (array_agg(payload_json::jsonb->'utm'->>'source' ORDER BY created_at ASC)
        FILTER (WHERE event_name = ${STORE_EVENT.globalContext}))[1] AS utm_source,
      (array_agg(payload_json::jsonb->>'fbclid' ORDER BY created_at ASC)
        FILTER (WHERE event_name = ${STORE_EVENT.globalContext}))[1] AS fbclid,
      (array_agg(payload_json::jsonb->>'igshid' ORDER BY created_at ASC)
        FILTER (WHERE event_name = ${STORE_EVENT.globalContext}))[1] AS igshid
    FROM sales_micro_event
    WHERE created_at >= ${since}
    GROUP BY session_key
  `);

  const sourceRows = sourceRes.rows as {
    session_key: unknown;
    referrer_first: unknown;
    context_source: unknown;
    utm_source: unknown;
    fbclid: unknown;
    igshid: unknown;
  }[];

  const sourceCounts = new Map<string, number>();
  for (const row of sourceRows) {
    const referrer =
      typeof row.referrer_first === "string" && row.referrer_first.trim() ? row.referrer_first : null;
    const contextSource =
      typeof row.context_source === "string" && row.context_source.trim() ? row.context_source : null;
    const utmSource =
      typeof row.utm_source === "string" && row.utm_source.trim() ? row.utm_source : null;
    const fbclid = typeof row.fbclid === "string" && row.fbclid.trim() ? row.fbclid : null;
    const igshid = typeof row.igshid === "string" && row.igshid.trim() ? row.igshid : null;
    const label = classifyTrafficSource(referrer, contextSource, utmSource, { fbclid, igshid });
    sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1);
  }

  const totalSourceSessions = sourceRows.length;
  const rawSlices = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, sessions]) => ({
      label,
      sessions,
      ratePct: totalSourceSessions > 0 ? (100 * sessions) / totalSourceSessions : 0,
    }));
  const trafficSources = mergePinnedTrafficSources(rawSlices, totalSourceSessions);

  const scrollRes = await db.execute(sql`
    SELECT
      COALESCE(NULLIF(payload_json::jsonb->>'depth_pct', ''), '0')::int AS depth,
      COUNT(DISTINCT session_key)::int AS sessions
    FROM sales_micro_event
    WHERE created_at >= ${since}
      AND event_name = 'pa_scroll'
    GROUP BY 1
    ORDER BY 1
  `);

  const scrollRows = scrollRes.rows as { depth: unknown; sessions: unknown }[];
  const scrollByDepth = new Map<number, number>();
  for (const row of scrollRows) {
    const depth = Number(row.depth ?? 0);
    const sessions = Number(row.sessions ?? 0);
    if (!Number.isFinite(depth) || depth <= 0 || !Number.isFinite(sessions)) continue;
    scrollByDepth.set(depth, sessions);
  }

  const depthLabels = [
    { depth: 25, label: "25% of page" },
    { depth: 50, label: "50% of page" },
    { depth: 75, label: "75% of page" },
    { depth: 100, label: "Bottom of page (100%)" },
  ];

  const scrollSessions = depthLabels.map((item) => scrollByDepth.get(item.depth) ?? 0);
  const scrollMax = Math.max(1, ...scrollSessions);
  const scrollDepth = depthLabels.map((item, index) => {
    const sessions = scrollSessions[index] ?? 0;
    return {
      label: item.label,
      sessions,
      sessionsLabel: `${fmtInt(sessions)} session(s)`,
      pct: (100 * sessions) / scrollMax,
    };
  });

  const heatmapBands = depthLabels.map((item, index) => ({
    label: item.label,
    intensityPct: Math.round(scrollDepth[index]?.pct ?? 0),
  }));

  const top25 = scrollByDepth.get(25) ?? 0;
  const bottom100 = scrollByDepth.get(100) ?? 0;
  let scrollInsight: string | null = null;
  let scrollRecommendation: string | null = null;
  if (top25 > 0 && bottom100 >= 0) {
    const reachBottomPct = (100 * bottom100) / top25;
    scrollInsight = `${fmtPct(reachBottomPct, 0)} of sessions that reach 25% scroll depth continue to the bottom of the page.`;
    if (reachBottomPct < 35) {
      scrollRecommendation =
        "Move social proof elements and the secondary CTA above the long description section.";
    }
  }

  const productPageRes = await db.execute(sql`
    SELECT page_path
    FROM sales_micro_event
    WHERE created_at >= ${since}
      AND event_name = 'pa_scroll'
      AND page_path IS NOT NULL
      AND page_path <> ''
    GROUP BY page_path
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `);
  const productPageRow = productPageRes.rows[0] as { page_path: unknown } | undefined;
  const productPageLabel =
    typeof productPageRow?.page_path === "string" && productPageRow.page_path ?
      productPageRow.page_path
    : null;

  const replayRes = await db.execute(sql`
    WITH cart_sessions AS (
      SELECT DISTINCT session_key
      FROM sales_micro_event
      WHERE created_at >= ${since}
        AND event_name = ${STORE_EVENT.addToCart}
    ),
    purchase_sessions AS (
      SELECT DISTINCT session_key
      FROM sales_micro_event
      WHERE created_at >= ${since}
        AND event_name = ${STORE_EVENT.purchase}
    ),
    abandoned AS (
      SELECT session_key
      FROM cart_sessions
      EXCEPT
      SELECT session_key
      FROM purchase_sessions
    )
    SELECT
      e.session_key,
      EXTRACT(EPOCH FROM (MAX(e.created_at) - MIN(e.created_at)))::double precision AS duration_s,
      MAX(e.payload_json::jsonb->>'device') FILTER (
        WHERE e.event_name = ${STORE_EVENT.globalContext}
      ) AS device
    FROM sales_micro_event e
    INNER JOIN abandoned a ON a.session_key = e.session_key
    WHERE e.created_at >= ${since}
    GROUP BY e.session_key
    ORDER BY MAX(e.created_at) DESC
    LIMIT 6
  `);

  const sessionReplays = (replayRes.rows as { session_key: unknown; duration_s: unknown; device: unknown }[]).map(
    (row, index) => {
      const sessionKey = typeof row.session_key === "string" ? row.session_key : `session-${index + 1}`;
      const tail = sessionKey.slice(-4).toUpperCase();
      const device = typeof row.device === "string" && row.device ? row.device : "Unknown";
      return {
        id: tail,
        durationLabel: fmtDuration(Number(row.duration_s ?? 0)),
        device: device.charAt(0).toUpperCase() + device.slice(1),
        status: "Cart abandonment",
      };
    }
  );

  const hasTrafficData = totalSourceSessions > 0;
  if (
    !hasTrafficData &&
    scrollDepth.every((row) => row.sessions === 0) &&
    sessionReplays.length === 0
  ) {
    return emptyUserBehavior();
  }

  const trafficSourcesForBrief =
    hasTrafficData ? trafficSources : mergePinnedTrafficSources([], 0);

  return {
    trafficSources: trafficSourcesForBrief,
    heatmapBands,
    scrollDepth,
    scrollInsight,
    scrollRecommendation,
    sessionReplays,
    productPageLabel,
  };
}

export async function buildConceptionOverview(): Promise<ConceptionOverviewDto> {
  const now = Date.now();
  const d7 = new Date(now - 7 * MS_DAY);
  const d14 = new Date(now - 14 * MS_DAY);
  const d24h = new Date(now - 24 * MS_DAY);
  const d15m = new Date(now - 15 * 60 * 1000);
  const d2h = new Date(now - 6 * 60 * 60 * 1000);
  const funnelLiveHours = 6;
  const mid = new Date(now - 7 * MS_DAY);

  const [
    sessions7d,
    events7d,
    funnel,
    funnelLive,
    sessionsPrev7dWindow,
    active15m,
    traffic,
    topPages,
    devices,
    security,
    userBehavior,
  ] = await Promise.all([
    distinctSessionsSince(d7),
    totalEventsSince(d7),
    funnelCounts(d7),
    funnelCounts(d2h),
    distinctSessionsBetween(d14, mid),
    distinctSessionsSince(d15m),
    trafficHourlyNormalized(d24h),
    topPagesByVolume(d7, 8),
    deviceSlices(d7),
    securityBrief(d7),
    buildUserBehaviorBrief(d7),
  ]);

  const funnelOld = await funnelCounts(d14, mid);

  const rateNow = funnel.nCart > 0 ? funnel.nFinal / funnel.nCart : 0;
  const rateOld = funnelOld.nCart > 0 ? funnelOld.nFinal / funnelOld.nCart : 0;
  const deltaConv = rateOld > 0 ? ((rateNow - rateOld) / rateOld) * 100 : 0;

  const cartAbandonProxy =
    funnel.nCart > 0 ? Math.min(100, Math.max(0, 100 * (1 - funnel.nFinal / funnel.nCart))) : 0;

  const kpis: ConceptionKpiRow[] = [
    {
      label: "Conversion rate",
      value: fmtPct(100 * rateNow, 2),
      delta: `${deltaConv >= 0 ? "+" : ""}${fmtPct(deltaConv, 2)}`,
      deltaPositive: deltaConv >= 0,
    },
    {
      label: "Unique visitors (7d)",
      value: fmtInt(sessions7d),
      delta:
        sessionsPrev7dWindow > 0
          ? `${sessions7d >= sessionsPrev7dWindow ? "+" : ""}${fmtPct(
              (100 * (sessions7d - sessionsPrev7dWindow)) / sessionsPrev7dWindow,
              1
            )} vs prev. period`
          : "—",
      deltaPositive: sessions7d >= sessionsPrev7dWindow,
    },
    {
      label: "Cart abandonment (proxy)",
      value: fmtPct(cartAbandonProxy, 1),
      delta: "Cart → order",
      deltaPositive: cartAbandonProxy < 65,
    },
    {
      label: "Events (7d)",
      value: fmtInt(events7d),
      delta: "micro collection",
      deltaPositive: true,
    },
  ];

  const funnelSummary: ConceptionFunnelSummary[] = [
    {
      label: "Overall conversion rate",
      value: fmtPct(100 * rateNow, 2),
      sub: `${deltaConv >= 0 ? "+" : ""}${fmtPct(deltaConv, 2)} vs previous window`,
      subTone: deltaConv >= 0 ? "emerald" : "rose",
    },
    {
      label: "Average loss per step",
      value:
        funnel.nProduct > 0
          ? fmtPct(
              (100 * (funnel.nProduct - funnel.nFinal)) /
                Math.max(1, 4 * funnel.nProduct - funnel.nFinal),
              1
            )
          : "—",
      sub: "Based on the 4-step funnel",
      subTone: "amber",
    },
    {
      label: "Active sessions (15 min)",
      value: fmtInt(active15m),
      sub: "Distinct session keys",
      subTone: "emerald",
    },
  ];

  const hasEventData = events7d > 0;
  const alertRuleSettings = await getConceptionAlertRuleSettings();

  return {
    source: hasEventData ? "live" : "empty",
    hasEventData,
    windowDays: 7,
    kpis,
    funnelSteps: buildFunnelSteps(funnelLive),
    funnelStepsLive: buildFunnelSteps(funnelLive),
    funnelLiveHours,
    funnelSummary,
    frictionItems: buildFriction(funnelLive),
    topPages,
    devices,
    trafficHourlyNormalized: traffic,
    activeVisitors15m: active15m,
    totalEvents7d: events7d,
    security,
    userBehavior,
    alertRules: settingsToAlertRules(alertRuleSettings),
    computedAt: new Date().toISOString(),
  };
}

/** Metrics for the analyze job (narrow windows). */
export async function buildConceptionAnalyzeSignals() {
  const now = Date.now();
  const d7 = new Date(now - 7 * MS_DAY);
  const d2h = new Date(now - 2 * 60 * 60 * 1000);
  const d15m = new Date(now - 15 * 60 * 1000);
  const d90m = new Date(now - 90 * 60 * 1000);

  const funnel7 = await funnelCounts(d7);
  const funnelOld = await funnelCounts(new Date(now - 14 * MS_DAY), new Date(now - 7 * MS_DAY));

  const rateNow = funnel7.nCart > 0 ? funnel7.nFinal / funnel7.nCart : 0;
  const rateOld = funnelOld.nCart > 0 ? funnelOld.nFinal / funnelOld.nCart : 0;

  const events15m = await totalEventsSince(d15m);
  const events90m = await totalEventsSince(d90m);
  const baseline15 = Math.max(1, (events90m - events15m) / 5);

  const [cart2h, final2h] = await Promise.all([
    scalarInt(
      db
        .select({
          n: sql<number>`count(distinct ${salesMicroEventTable.sessionKey})::int`.as("n"),
        })
        .from(salesMicroEventTable)
        .where(
          and(gte(salesMicroEventTable.createdAt, d2h), eq(salesMicroEventTable.eventName, STORE_EVENT.addToCart))
        )
    ),
    scalarInt(
      db
        .select({
          n: sql<number>`count(distinct ${salesMicroEventTable.sessionKey})::int`.as("n"),
        })
        .from(salesMicroEventTable)
        .where(
          and(
            gte(salesMicroEventTable.createdAt, d2h),
            eq(salesMicroEventTable.eventName, STORE_EVENT.purchase)
          )
        )
    ),
  ]);
  const cartAbandon2h = cart2h > 0 ? 1 - final2h / cart2h : 0;

  const sessionsCheckout2h = await scalarInt(
    db
      .select({
        n: sql<number>`count(distinct ${salesMicroEventTable.sessionKey})::int`.as("n"),
      })
      .from(salesMicroEventTable)
      .where(
        and(
          gte(salesMicroEventTable.createdAt, d2h),
          sql`lower(${salesMicroEventTable.pagePath}) like '%checkout%'`
        )
      )
  );

  const jsErrorSessions = await scalarInt(
    db
      .select({
        n: sql<number>`count(distinct ${salesMicroEventTable.sessionKey})::int`.as("n"),
      })
      .from(salesMicroEventTable)
      .where(
        and(
          gte(salesMicroEventTable.createdAt, d2h),
          eq(salesMicroEventTable.eventName, PA_JS_ERROR)
        )
      )
  );

  let slowNavSessions = 0;
  let lcpSlowSessions = 0;
  try {
    const perfN = await scalarInt(
      db
        .select({
          n: sql<number>`count(distinct ${salesMicroEventTable.sessionKey})::int`.as("n"),
        })
        .from(salesMicroEventTable)
        .where(
          and(
            gte(salesMicroEventTable.createdAt, d2h),
            eq(salesMicroEventTable.eventName, STORE_EVENT.pagePerformance),
            sql`(
              coalesce((payload_json::jsonb->>'page_load_ms')::numeric, 0) > 4000
              or coalesce((payload_json::jsonb->>'lcp_ms')::numeric, 0) > 4000
            )`
          )
        )
    );
    slowNavSessions = perfN;
    lcpSlowSessions = 0;
  } catch {
    slowNavSessions = 0;
    lcpSlowSessions = 0;
  }

  return {
    rateNow,
    rateOld,
    events15m,
    baseline15,
    cartAbandon2h,
    cart2h,
    final2h,
    sessionsCheckout2h,
    jsErrorSessions,
    slowNavSessions,
    lcpSlowSessions,
    funnel7,
  };
}
