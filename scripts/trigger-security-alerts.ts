import dotenv from "dotenv";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { conceptionAlertTable, salesMicroEventTable } from "@/server/db/schema";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const DEFAULT_SESSIONS = 2;
const DEFAULT_EVENTS_PER_SESSION = 55;
const WINDOW_MS = 5 * 60 * 1000;

type CliOptions = {
  sessions: number;
  eventsPerSession: number;
  telemetryOnly: boolean;
  alertsOnly: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    sessions: DEFAULT_SESSIONS,
    eventsPerSession: DEFAULT_EVENTS_PER_SESSION,
    telemetryOnly: false,
    alertsOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--telemetry-only") {
      options.telemetryOnly = true;
      continue;
    }
    if (arg === "--alerts-only") {
      options.alertsOnly = true;
      continue;
    }
    if (arg === "--sessions") {
      options.sessions = Math.max(1, Number(argv[index + 1] ?? DEFAULT_SESSIONS));
      index += 1;
      continue;
    }
    if (arg === "--events-per-session") {
      options.eventsPerSession = Math.max(50, Number(argv[index + 1] ?? DEFAULT_EVENTS_PER_SESSION));
      index += 1;
    }
  }

  return options;
}

function hourFingerprint(prefix: string) {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}`;
  return `${prefix}-${stamp}`;
}

function makeSessionKey(index: number) {
  const suffix = randomBytes(4).toString("hex");
  return `sec-demo-${index + 1}-${suffix}`.slice(0, 64);
}

async function seedHighVelocityTelemetry(sessions: number, eventsPerSession: number) {
  const now = Date.now();
  const startAt = new Date(now - WINDOW_MS);
  const rows: (typeof salesMicroEventTable.$inferInsert)[] = [];

  for (let sessionIndex = 0; sessionIndex < sessions; sessionIndex += 1) {
    const sessionKey = makeSessionKey(sessionIndex);
    const stepMs = Math.max(1, Math.floor(WINDOW_MS / eventsPerSession));

    for (let eventIndex = 0; eventIndex < eventsPerSession; eventIndex += 1) {
      const createdAt = new Date(startAt.getTime() + eventIndex * stepMs);
      rows.push({
        sessionKey,
        pagePath: "/shop-details",
        eventName: eventIndex % 17 === 0 ? "pa_global_context" : "pa_product_view",
        payloadJson: JSON.stringify({
          device: "desktop",
          source: "security-alert-script",
          sequence: eventIndex,
        }),
        sequenceIndex: eventIndex,
        createdAt,
        clientEventAt: createdAt,
      });
    }
  }

  await db.insert(salesMicroEventTable).values(rows);

  return {
    sessions,
    eventsInserted: rows.length,
    sessionKeys: rows
      .map((row) => row.sessionKey)
      .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index),
  };
}

async function readSecuritySnapshot() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const result = await db.execute(sql`
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
  const row = result.rows[0] as { n: unknown } | undefined;
  const highVelocitySessions = Number(row?.n ?? 0);
  return {
    highVelocitySessions,
    suspiciousSessions7d: highVelocitySessions,
  };
}

async function insertSecurityAlerts(sessions: number) {
  const alerts: (typeof conceptionAlertTable.$inferInsert)[] = [
    {
      alertType: "SECURITY_HIGH_VELOCITY",
      severity: "critical",
      title: "Sessions à haute vélocité détectées",
      description:
        "Plusieurs sessions envoient un volume anormal de micro-événements en moins de 6 minutes (heuristique bot / scraping).",
      detail: `${sessions} session(s) synthétique(s) injectée(s) par scripts/trigger-security-alerts.ts pour valider le tableau Sécurité.`,
      affectedSessionsEstimate: sessions,
      metadataJson: JSON.stringify({ source: "trigger-security-alerts", sessions }),
      fingerprint: hourFingerprint("SECURITY_HIGH_VELOCITY"),
    },
    {
      alertType: "SECURITY_SUSPICIOUS_TRAFFIC",
      severity: "high",
      title: "Trafic suspect sur la vitrine",
      description:
        "Densité d'événements incompatible avec une navigation humaine normale sur les pages produit.",
      detail: "Corrélation avec des rafales pa_product_view répétées sur une fenêtre courte.",
      affectedSessionsEstimate: sessions,
      metadataJson: JSON.stringify({ source: "trigger-security-alerts", pattern: "burst_product_view" }),
      fingerprint: hourFingerprint("SECURITY_SUSPICIOUS_TRAFFIC"),
    },
  ];

  let inserted = 0;
  for (const alert of alerts) {
    const rows = await db
      .insert(conceptionAlertTable)
      .values(alert)
      .onConflictDoNothing({ target: conceptionAlertTable.fingerprint })
      .returning({ id: conceptionAlertTable.id });
    inserted += rows.length;
  }

  return { attempted: alerts.length, inserted };
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Set it in .env.local before running this script.");
  }

  const options = parseArgs(process.argv.slice(2));
  if (options.telemetryOnly && options.alertsOnly) {
    throw new Error("Use only one of --telemetry-only or --alerts-only.");
  }

  const shouldSeedTelemetry = !options.alertsOnly;
  const shouldInsertAlerts = !options.telemetryOnly;

  let telemetrySummary: Awaited<ReturnType<typeof seedHighVelocityTelemetry>> | null = null;
  if (shouldSeedTelemetry) {
    telemetrySummary = await seedHighVelocityTelemetry(options.sessions, options.eventsPerSession);
    console.log(
      JSON.stringify(
        {
          step: "telemetry_seeded",
          sessions: telemetrySummary.sessions,
          eventsInserted: telemetrySummary.eventsInserted,
          sessionKeys: telemetrySummary.sessionKeys,
        },
        null,
        2
      )
    );
  }

  let alertSummary: Awaited<ReturnType<typeof insertSecurityAlerts>> | null = null;
  if (shouldInsertAlerts) {
    alertSummary = await insertSecurityAlerts(options.sessions);
    console.log(
      JSON.stringify(
        {
          step: "security_alerts_inserted",
          attempted: alertSummary.attempted,
          inserted: alertSummary.inserted,
          note:
            alertSummary.inserted === 0 ?
              "No new alert rows inserted (hourly fingerprint already exists for this hour)."
            : "Open Seller Helper → Security / Alerts, or run Lancer l'analyse.",
        },
        null,
        2
      )
    );
  }

  const security = await readSecuritySnapshot();
  console.log(
    JSON.stringify(
      {
        step: "security_overview_snapshot",
        highVelocitySessions: security.highVelocitySessions,
        suspiciousSessions7d: security.suspiciousSessions7d,
      },
      null,
      2
    )
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
