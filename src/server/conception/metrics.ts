import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { salesMicroEventTable } from "@/server/db/schema";
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
} from "@/types/conception-admin";

const MS_DAY = 86_400_000;

function fmtInt(n: number): string {
  return new Intl.NumberFormat("fr-DZ").format(Math.round(n));
}

function fmtPct(p: number, digits = 1): string {
  if (!Number.isFinite(p)) return "0%";
  return `${p.toFixed(digits).replace(".", ",")}%`;
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

/** Funnel counts: nested subsets of sessions (7d window). */
async function funnelCounts(since: Date): Promise<{
  nProduct: number;
  nCart: number;
  nCheckoutPath: number;
  nFinal: number;
}> {
  const res = await db.execute(sql`
    WITH pe AS (
      SELECT DISTINCT session_key
      FROM sales_micro_event
      WHERE created_at >= ${since} AND event_name = ${STORE_EVENT.productView}
    ),
    cart AS (
      SELECT DISTINCT session_key
      FROM sales_micro_event
      WHERE created_at >= ${since} AND event_name = ${STORE_EVENT.addToCart}
    ),
    chk_path AS (
      SELECT DISTINCT session_key
      FROM sales_micro_event
      WHERE created_at >= ${since}
        AND (
          event_name = ${STORE_EVENT.beginCheckout}
          OR lower(page_path) LIKE '%checkout%'
        )
    ),
    fin AS (
      SELECT DISTINCT session_key
      FROM sales_micro_event
      WHERE created_at >= ${since} AND event_name = ${STORE_EVENT.purchase}
    )
    SELECT
      (SELECT COUNT(*)::int FROM pe) AS n_product,
      (SELECT COUNT(*)::int FROM pe INNER JOIN cart USING (session_key)) AS n_cart,
      (SELECT COUNT(*)::int FROM pe INNER JOIN cart USING (session_key) INNER JOIN chk_path USING (session_key)) AS n_checkout_path,
      (SELECT COUNT(*)::int FROM pe INNER JOIN cart USING (session_key) INNER JOIN fin USING (session_key)) AS n_final
  `);
  const row = res.rows[0] as
    | {
        n_product: unknown;
        n_cart: unknown;
        n_checkout_path: unknown;
        n_final: unknown;
      }
    | undefined;
  return {
    nProduct: Number(row?.n_product ?? 0),
    nCart: Number(row?.n_cart ?? 0),
    nCheckoutPath: Number(row?.n_checkout_path ?? 0),
    nFinal: Number(row?.n_final ?? 0),
  };
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

  const counts = rows.map((r) => r.cnt);
  const max = Math.max(1, ...counts);
  return rows.map((r) => clamp01(r.cnt / max));
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
      { name: "Mobile", pct: 0, color: "bg-orange-500" },
      { name: "Desktop", pct: 0, color: "bg-amber-500" },
      { name: "Tablet", pct: 0, color: "bg-orange-800" },
    ];
  }
  const mobile = row?.mobile ?? 0;
  const tablet = row?.tablet ?? 0;
  const desktop = Math.max(0, tot - mobile - tablet);
  const pM = (100 * mobile) / tot;
  const pT = (100 * tablet) / tot;
  const pD = Math.max(0, 100 - pM - pT);
  return [
    { name: "Mobile", pct: Math.round(pM), color: "bg-orange-500" },
    { name: "Desktop", pct: Math.round(pD), color: "bg-amber-500" },
    { name: "Tablet", pct: Math.round(pT), color: "bg-orange-800" },
  ];
}

async function securityBrief(since: Date): Promise<ConceptionSecurityBrief> {
  const hv = await db.execute(sql`
    SELECT COUNT(*)::int AS n
    FROM (
      SELECT session_key
      FROM sales_micro_event
      WHERE created_at >= ${since}
      GROUP BY session_key
      HAVING COUNT(*) >= 50
        AND EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) <= 360
    ) s
  `);
  const hvRow = hv.rows[0] as { n: unknown } | undefined;
  const highVelocity = Number(hvRow?.n ?? 0);

  const suspicious = highVelocity;

  const notes: string[] = [];
  if (highVelocity > 0) {
    notes.push(
      `${fmtInt(highVelocity)} session(s) avec très forte densité d'événements en moins de 6 minutes (heuristique type bot / scraping).`
    );
  } else {
    notes.push("Aucune session à haute vélocité détectée sur la fenêtre courante.");
  }
  notes.push(
    "Pour une détection renforcée (souris, patterns répétés), étendez le script client (événements cb_* du contrat Conception)."
  );

  return {
    suspiciousSessions7d: suspicious,
    highVelocitySessions: highVelocity,
    notes,
  };
}

function buildFunnelSteps(f: {
  nProduct: number;
  nCart: number;
  nCheckoutPath: number;
  nFinal: number;
}): ConceptionFunnelStep[] {
  const base = Math.max(1, f.nProduct);
  const steps: { title: string; n: number }[] = [
    { title: "Page produit", n: f.nProduct },
    { title: "Ajout au panier", n: f.nCart },
    { title: "Initiation paiement", n: f.nCheckoutPath },
    { title: "Commande finalisée", n: f.nFinal },
  ];

  return steps.map((s, i) => {
    const prevN = i === 0 ? s.n : steps[i - 1]!.n;
    const fromPrev = prevN > 0 ? (100 * s.n) / prevN : 0;
    const overall = (100 * s.n) / base;
    const abandon = i === 0 ? null : prevN > 0 ? (100 * (prevN - s.n)) / prevN : null;
    return {
      title: s.title,
      count: s.n,
      countLabel: fmtInt(s.n),
      fromPrevLabel: i === 0 ? "100,0% du précédent" : `${fmtPct(fromPrev)} du précédent`,
      overallLabel: `${fmtPct(overall)}`,
      abandonLabel: abandon === null ? null : `${fmtPct(abandon)} d'abandon`,
      barPct: Math.min(100, overall),
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
        priority: "PRIORITÉ HAUTE",
        priorityClass: "border-rose-500/40 bg-rose-500/10 text-rose-200",
        title: "Page produit → Panier",
        body: `${fmtPct(drop)} d'abandon entre la vue produit et l'intention d'achat.`,
        reco: "Renforcer la preuve sociale, clarifier la disponibilité et le prix, réduire la friction sur le CTA principal.",
      });
    }
  }
  if (f.nCart > 0 && f.nCheckoutPath > 0) {
    const drop = 100 * (1 - f.nCheckoutPath / f.nCart);
    if (drop >= 20) {
      items.push({
        priority: "PRIORITÉ HAUTE",
        priorityClass: "border-rose-500/40 bg-rose-500/10 text-rose-200",
        title: "Panier → Paiement",
        body: `${fmtPct(drop)} d'abandon — principal point de friction détecté sur les données réelles.`,
        reco: "Réduire les étapes du tunnel, proposer le paiement invité, afficher tôt les frais de livraison.",
      });
    }
  }
  if (f.nCheckoutPath > 0) {
    const drop = 100 * (1 - f.nFinal / f.nCheckoutPath);
    if (drop >= 15) {
      items.push({
        priority: "PRIORITÉ MOYENNE",
        priorityClass: "border-amber-500/40 bg-amber-500/10 text-amber-200",
        title: "Paiement → Finalisation",
        body: `${fmtPct(drop)} d'abandon à la dernière étape (retour paiement / erreurs).`,
        reco: "Surveiller les erreurs JS (cb_js_error), tester le flux Chargily et le mobile sur le formulaire.",
      });
    }
  }
  if (items.length === 0) {
    items.push({
      priority: "ANALYSE",
      priorityClass: "border-zinc-600/50 bg-zinc-800/40 text-zinc-300",
      title: "Volume insuffisant ou tunnel sain",
      body: "Pas de friction majeure détectée sur la fenêtre actuelle, ou pas assez de données pour conclure.",
      reco: "Lancez une analyse planifiée après accumulation de trafic, et enrichissez le tracking (scroll, hover, erreurs).",
    });
  }
  return items.slice(0, 4);
}

export async function buildConceptionOverview(): Promise<ConceptionOverviewDto> {
  const now = Date.now();
  const d7 = new Date(now - 7 * MS_DAY);
  const d14 = new Date(now - 14 * MS_DAY);
  const d24h = new Date(now - 24 * MS_DAY);
  const d15m = new Date(now - 15 * 60 * 1000);
  const mid = new Date(now - 7 * MS_DAY);

  const [
    sessions7d,
    events7d,
    funnel,
    sessionsPrev7dWindow,
    active15m,
    traffic,
    topPages,
    devices,
    security,
  ] = await Promise.all([
    distinctSessionsSince(d7),
    totalEventsSince(d7),
    funnelCounts(d7),
    distinctSessionsBetween(d14, mid),
    distinctSessionsSince(d15m),
    trafficHourlyNormalized(d24h),
    topPagesByVolume(d7, 8),
    deviceSlices(d7),
    securityBrief(d7),
  ]);

  const prevRes = await db.execute(sql`
    WITH evt_window AS (
      SELECT * FROM sales_micro_event
      WHERE created_at >= ${d14} AND created_at < ${mid}
    ),
    pe AS (SELECT DISTINCT session_key FROM evt_window WHERE event_name = ${STORE_EVENT.productView}),
    cart AS (SELECT DISTINCT session_key FROM evt_window WHERE event_name = ${STORE_EVENT.addToCart}),
    chk_path AS (
      SELECT DISTINCT session_key FROM evt_window
      WHERE event_name = ${STORE_EVENT.beginCheckout} OR lower(page_path) LIKE '%checkout%'
    ),
    fin AS (SELECT DISTINCT session_key FROM evt_window WHERE event_name = ${STORE_EVENT.purchase})
    SELECT
      (SELECT COUNT(*)::int FROM pe) AS n_product,
      (SELECT COUNT(*)::int FROM pe INNER JOIN cart USING (session_key)) AS n_cart,
      (SELECT COUNT(*)::int FROM pe INNER JOIN cart USING (session_key) INNER JOIN chk_path USING (session_key)) AS n_checkout_path,
      (SELECT COUNT(*)::int FROM pe INNER JOIN cart USING (session_key) INNER JOIN fin USING (session_key)) AS n_final
  `);
  const prow = prevRes.rows[0] as
    | { n_product: unknown; n_cart: unknown; n_checkout_path: unknown; n_final: unknown }
    | undefined;
  const funnelOld = {
    nProduct: Number(prow?.n_product ?? 0),
    nCart: Number(prow?.n_cart ?? 0),
    nCheckoutPath: Number(prow?.n_checkout_path ?? 0),
    nFinal: Number(prow?.n_final ?? 0),
  };

  const rateNow = funnel.nProduct > 0 ? funnel.nFinal / funnel.nProduct : 0;
  const rateOld = funnelOld.nProduct > 0 ? funnelOld.nFinal / funnelOld.nProduct : 0;
  const deltaConv = rateOld > 0 ? ((rateNow - rateOld) / rateOld) * 100 : 0;

  const cartAbandonProxy =
    funnel.nCart > 0 ? Math.min(100, Math.max(0, 100 * (1 - funnel.nFinal / funnel.nCart))) : 0;

  const kpis: ConceptionKpiRow[] = [
    {
      label: "Taux de conversion",
      value: fmtPct(100 * rateNow, 2),
      delta: `${deltaConv >= 0 ? "+" : ""}${fmtPct(deltaConv, 2)}`,
      deltaPositive: deltaConv >= 0,
    },
    {
      label: "Visiteurs uniques (7j)",
      value: fmtInt(sessions7d),
      delta:
        sessionsPrev7dWindow > 0
          ? `${sessions7d >= sessionsPrev7dWindow ? "+" : ""}${fmtPct(
              (100 * (sessions7d - sessionsPrev7dWindow)) / sessionsPrev7dWindow,
              1
            )} vs période préc.`
          : "—",
      deltaPositive: sessions7d >= sessionsPrev7dWindow,
    },
    {
      label: "Abandon panier (proxy)",
      value: fmtPct(cartAbandonProxy, 1),
      delta: "Panier → commande",
      deltaPositive: cartAbandonProxy < 65,
    },
    {
      label: "Événements (7j)",
      value: fmtInt(events7d),
      delta: "collecte micro",
      deltaPositive: true,
    },
  ];

  const funnelSummary: ConceptionFunnelSummary[] = [
    {
      label: "Taux de conversion global",
      value: fmtPct(100 * rateNow, 2),
      sub: `${deltaConv >= 0 ? "+" : ""}${fmtPct(deltaConv, 2)} vs fenêtre précédente`,
      subTone: deltaConv >= 0 ? "emerald" : "rose",
    },
    {
      label: "Perte moyenne par étape",
      value:
        funnel.nProduct > 0
          ? fmtPct(
              (100 * (funnel.nProduct - funnel.nFinal)) /
                Math.max(1, 4 * funnel.nProduct - funnel.nFinal),
              1
            )
          : "—",
      sub: "Basé sur le tunnel 4 étapes",
      subTone: "amber",
    },
    {
      label: "Sessions actives (15 min)",
      value: fmtInt(active15m),
      sub: "Clés de session distinctes",
      subTone: "emerald",
    },
  ];

  const hasEventData = events7d > 0;

  let trafficChart = traffic;
  if (trafficChart.length < 8) {
    const base = trafficChart.length ? trafficChart.reduce((a, b) => a + b, 0) / trafficChart.length : 0.2;
    trafficChart = Array.from({ length: 24 }, (_, i) => {
      const t = i / 23;
      return clamp01(base + 0.15 * Math.sin(t * Math.PI * 2));
    });
  } else if (trafficChart.length > 24) {
    trafficChart = trafficChart.slice(-24);
  } else {
    while (trafficChart.length < 24) {
      trafficChart.push(trafficChart[trafficChart.length - 1] ?? 0.1);
    }
  }

  return {
    source: hasEventData ? "live" : "empty",
    hasEventData,
    windowDays: 7,
    kpis,
    funnelSteps: buildFunnelSteps(funnel),
    funnelSummary,
    frictionItems: buildFriction(funnel),
    topPages,
    devices,
    trafficHourlyNormalized: trafficChart,
    activeVisitors15m: active15m,
    totalEvents7d: events7d,
    security,
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
  const foRes = await db.execute(sql`
    WITH evt_window AS (
      SELECT * FROM sales_micro_event
      WHERE created_at >= ${new Date(now - 14 * MS_DAY)} AND created_at < ${new Date(now - 7 * MS_DAY)}
    ),
    pe AS (SELECT DISTINCT session_key FROM evt_window WHERE event_name = ${STORE_EVENT.productView}),
    fin AS (SELECT DISTINCT session_key FROM evt_window WHERE event_name = ${STORE_EVENT.purchase})
    SELECT
      (SELECT COUNT(*)::int FROM pe) AS n_product,
      (SELECT COUNT(*)::int FROM pe INNER JOIN fin USING (session_key)) AS n_final
  `);
  const foRow = foRes.rows[0] as { n_product: unknown; n_final: unknown } | undefined;
  const funnelOld = {
    nProduct: Number(foRow?.n_product ?? 0),
    nFinal: Number(foRow?.n_final ?? 0),
  };

  const rateNow = funnel7.nProduct > 0 ? funnel7.nFinal / funnel7.nProduct : 0;
  const rateOld = funnelOld.nProduct > 0 ? funnelOld.nFinal / funnelOld.nProduct : 0;

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
