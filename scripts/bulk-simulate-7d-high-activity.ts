/**
 * Backfill `sales_micro_event` for the **last 7 UTC days** (same window as Seller Helper
 * timeline range `7d`) with high, realistic volume **per catalog product**:
 *   - `pa_product_view` → timeline “Views”
 *   - distinct `session_key` → “Unique sessions” (any pa_* in bucket counts)
 *   - `pa_add_to_cart` → “Add to cart”
 *   - `pa_purchase` → “Sales” (conversion rate is derived)
 * Plus filler events (`pa_scroll`, `pa_pointer_hover`, `pa_begin_checkout`) so traffic
 * does not look view-only.
 *
 * Rows use `session_key` prefix `sim7_` so you can remove them:
 *   DELETE FROM sales_micro_event WHERE session_key LIKE 'sim7_%';
 *
 * Usage:
 *   npx tsx scripts/bulk-simulate-7d-high-activity.ts
 *   npx tsx scripts/bulk-simulate-7d-high-activity.ts --dry-run
 *   npx tsx scripts/bulk-simulate-7d-high-activity.ts --clear
 *   npx tsx scripts/bulk-simulate-7d-high-activity.ts --min-views=12000 --max-views=28000
 *   npx tsx scripts/bulk-simulate-7d-high-activity.ts --batch-size=4000
 */

import "./env-bootstrap";
import { like } from "drizzle-orm";
import { db } from "@/server/db";
import { salesMicroEventTable } from "@/server/db/schema";
import { getCatalogProducts } from "@/server/data-access/product-catalog";
import { STORE_EVENT } from "@/server/conception/event-contract";
import { resolveDatabaseConnectionString } from "@/lib/database-url";

const SESSION_PREFIX = "sim7_";
const MS_DAY = 86_400_000;
const DAY_BUCKETS = 7;

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function argNumber(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`${name}=`));
  if (!raw) return fallback;
  const n = Number(raw.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** `total` split into `buckets` nonnegative integers summing to `total`. */
function splitAcrossBuckets(total: number, buckets: number): number[] {
  if (buckets <= 0) return [];
  if (total <= 0) return Array.from({ length: buckets }, () => 0);
  const w = Array.from({ length: buckets }, () => Math.random());
  const s = w.reduce((a, b) => a + b, 0);
  const floors = w.map((x) => Math.floor((x / s) * total));
  let rem = total - floors.reduce((a, b) => a + b, 0);
  for (let i = 0; rem > 0; i = (i + 1) % buckets) {
    floors[i] += 1;
    rem -= 1;
  }
  return floors;
}

/** Partition `total` into `parts` positive integers summing to `total`. */
function partitionPositive(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  if (total <= 0) return [];
  const p = Math.min(parts, total);
  const base = Array.from({ length: p }, () => 1);
  let rem = total - p;
  for (let i = 0; rem > 0; i = (i + 1) % p) {
    base[i] += 1;
    rem -= 1;
  }
  shuffleInPlace(base);
  return base;
}

function utcDayBuckets(now = new Date()) {
  const aligned = new Date(now);
  aligned.setUTCHours(0, 0, 0, 0);
  const buckets: Date[] = [];
  for (let i = DAY_BUCKETS - 1; i >= 0; i -= 1) {
    buckets.push(new Date(aligned.getTime() - i * MS_DAY));
  }
  const rangeStart = buckets[0]!;
  const rangeEnd = new Date(aligned.getTime() + MS_DAY);
  return { buckets, rangeStart, rangeEnd };
}

function randomTimeInBucket(bucketStart: Date): Date {
  const t = bucketStart.getTime() + randomInt(0, MS_DAY - 2_000);
  return new Date(t);
}

function makeSessionKey(productId: number, dayIdx: number, sessionIdx: number): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const raw = `${SESSION_PREFIX}${productId}_${dayIdx}_${sessionIdx}_${rand}`;
  return raw.length <= 64 ? raw : raw.slice(0, 64);
}

type InsertRow = {
  sessionKey: string;
  userId: null;
  productLocalId: number;
  productTitle: string;
  pagePath: string;
  referrer: string | null;
  eventName: string;
  payloadJson: string | null;
  clientEventAt: Date;
  sequenceIndex: number;
  createdAt: Date;
};

async function clearSimRows() {
  await db.delete(salesMicroEventTable).where(like(salesMicroEventTable.sessionKey, `${SESSION_PREFIX}%`));
}

async function main() {
  const cs = resolveDatabaseConnectionString()?.trim();
  if (!cs) {
    console.error(
      "Missing database URL. Set DATABASE_URL, POSTGRES_URL, or NEON_DATABASE_URL in .env.local (see src/lib/database-url.ts)."
    );
    process.exit(1);
  }

  if (hasFlag("--clear")) {
    await clearSimRows();
    console.log(JSON.stringify({ cleared: true, prefix: SESSION_PREFIX }, null, 2));
    return;
  }

  const dryRun = hasFlag("--dry-run");
  const minViews = argNumber("--min-views", 10_000);
  const maxViews = argNumber("--max-views", 30_000);
  const batchSize = argNumber("--batch-size", 4000);
  const productLimit = argNumber("--product-limit", 0);

  if (minViews > maxViews) {
    console.error("--min-views must be <= --max-views");
    process.exit(1);
  }

  const products = await getCatalogProducts();
  const list = productLimit > 0 ? products.slice(0, productLimit) : products;

  if (list.length === 0) {
    console.log(JSON.stringify({ error: "no_products" }, null, 2));
    process.exit(1);
  }

  const { buckets, rangeStart, rangeEnd } = utcDayBuckets();

  if (dryRun) {
    const per = list.map((p) => ({
      id: p.id,
      title: p.title.slice(0, 40),
      views: randomInt(minViews, maxViews),
    }));
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          productCount: list.length,
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
          sample: per.slice(0, 5),
        },
        null,
        2
      )
    );
    return;
  }

  await clearSimRows();

  let totalRows = 0;
  const buffer: InsertRow[] = [];

  const flushChunks = async () => {
    while (buffer.length >= batchSize) {
      const chunk = buffer.splice(0, batchSize);
      await db.insert(salesMicroEventTable).values(chunk);
    }
  };

  const push = (row: InsertRow) => {
    buffer.push(row);
    totalRows += 1;
  };

  const pagePathFor = (productId: number) => `/shop-details?productId=${productId}`;

  for (const product of list) {
    const productId = Math.trunc(Number(product.id));
    if (!Number.isFinite(productId) || productId <= 0) continue;

    const targetViews = randomInt(minViews, maxViews);
    const sessionRate = randomInt(22, 42) / 100;
    const cartRate = randomInt(25, 75) / 1000;
    const purchaseOfCartRate = randomInt(18, 42) / 100;

    let targetSessions = Math.max(1, Math.floor(targetViews * sessionRate));
    targetSessions = Math.min(targetSessions, targetViews);

    let targetCarts = Math.floor(targetViews * cartRate);
    targetCarts = Math.min(Math.max(0, targetCarts), targetSessions);

    let targetPurchases = Math.floor(targetCarts * purchaseOfCartRate);
    targetPurchases = Math.min(targetPurchases, targetCarts);

    const viewsByDay = splitAcrossBuckets(targetViews, DAY_BUCKETS);
    const sessionsByDay = splitAcrossBuckets(targetSessions, DAY_BUCKETS);
    const cartsByDay = splitAcrossBuckets(targetCarts, DAY_BUCKETS);
    const purchasesByDay = splitAcrossBuckets(targetPurchases, DAY_BUCKETS);

    for (let d = 0; d < DAY_BUCKETS; d++) {
      let viewsD = viewsByDay[d] ?? 0;
      let sessionsD = sessionsByDay[d] ?? 0;
      let cartsD = cartsByDay[d] ?? 0;
      let purchasesD = purchasesByDay[d] ?? 0;

      if (viewsD <= 0) continue;
      sessionsD = Math.max(1, Math.min(sessionsD, viewsD));
      const sessionsEffective = sessionsD;
      cartsD = Math.min(cartsD, sessionsEffective);
      purchasesD = Math.min(purchasesD, cartsD);

      const viewCounts = partitionPositive(viewsD, sessionsEffective);

      const cartSessionIdx = new Set<number>();
      const idxPool = Array.from({ length: sessionsEffective }, (_, i) => i);
      shuffleInPlace(idxPool);
      for (let i = 0; i < cartsD; i++) cartSessionIdx.add(idxPool[i]!);

      const purchaseIdxPool = Array.from(cartSessionIdx);
      shuffleInPlace(purchaseIdxPool);
      const purchaseSessionIdx = new Set<number>();
      for (let i = 0; i < purchasesD; i++) purchaseSessionIdx.add(purchaseIdxPool[i]!);

      for (let si = 0; si < sessionsEffective; si++) {
        const sk = makeSessionKey(productId, d, si);
        const nViews = viewCounts[si] ?? 1;
        let seq = 0;
        let lastTs = randomTimeInBucket(buckets[d]!);

        const emit = (name: string, payload: Record<string, unknown> | null) => {
          lastTs = new Date(lastTs.getTime() + randomInt(50, 900));
          push({
            sessionKey: sk,
            userId: null,
            productLocalId: productId,
            productTitle: product.title.slice(0, 500),
            pagePath: pagePathFor(productId),
            referrer: Math.random() < 0.4 ? "https://www.google.com/" : "https://www.facebook.com/",
            eventName: name,
            payloadJson: payload ? JSON.stringify(payload) : null,
            clientEventAt: lastTs,
            sequenceIndex: seq++,
            createdAt: lastTs,
          });
        };

        for (let vi = 0; vi < nViews; vi++) {
          emit(STORE_EVENT.productView, {
            product_id: productId,
            index: vi,
          });
        }

        if (Math.random() < 0.55) {
          emit("pa_scroll", { product_id: productId, depth: randomInt(20, 95) });
        }
        if (Math.random() < 0.35) {
          emit("pa_pointer_hover", { product_id: productId, x: randomInt(0, 1200), y: randomInt(0, 800) });
        }

        if (cartSessionIdx.has(si)) {
          emit(STORE_EVENT.addToCart, { product_id: productId, qty: 1 });
          if (Math.random() < 0.5) {
            emit(STORE_EVENT.beginCheckout, { product_id: productId, step: "shipping" });
          }
        }

        if (purchaseSessionIdx.has(si)) {
          emit(STORE_EVENT.purchase, { product_id: productId, value: product.detailPrice ?? 0 });
        }
      }

      await flushChunks();
    }
  }

  while (buffer.length > 0) {
    const chunk = buffer.splice(0, Math.min(batchSize, buffer.length));
    await db.insert(salesMicroEventTable).values(chunk);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        products: list.length,
        rowsInserted: totalRows,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        sessionPrefix: SESSION_PREFIX,
        minViews,
        maxViews,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
