/**
 * Generate realistic random storefront data for every product in Postgres:
 * micro-events, shopping sequences, orders, reviews, site feedback, wishlist samples,
 * assistant telemetry, and refreshed product rating / stock.
 *
 * Tagged rows use session_key / request_id prefix `sim_site_` and order note `[simulation]`
 * so you can wipe them with: npx tsx scripts/simulate-storefront-analytics.ts --clear
 * After a clear, repopulate in one go: add `--refill` with `--clear`.
 *
 * Usage:
 *   npx tsx scripts/simulate-storefront-analytics.ts
 *   npx tsx scripts/simulate-storefront-analytics.ts --dry-run
 *   npx tsx scripts/simulate-storefront-analytics.ts --clear
 *   npx tsx scripts/simulate-storefront-analytics.ts --sessions-per-product=8 --max-events=30000
 */

import "./env-bootstrap";
import { desc, eq, inArray, like } from "drizzle-orm";
import { PA_EVENT_NAMES } from "@/lib/pa-whitelist";
import { resolveStorefrontProductId } from "@/server/data-access/product-catalog";
import { db } from "@/server/db";
import {
  assistantSearchTelemetryTable,
  costumer_orderTable,
  costumer_order_to_productTable,
  productReviewTable,
  productsTable,
  salesMicroEventTable,
  shoppingSequenceTable,
  siteFeedbackTable,
  user,
  wishlistTable,
  wishlist_to_productTable,
} from "@/server/db/schema";
import { ensureReviewTables } from "@/server/reviews/reviews-db";
import { insertSalesMicroEvents } from "@/server/sales-analyst/micro-events-db";

const SESSION_PREFIX = "sim_site_";

const WILAYAS = [
  { w: "Alger", c: "Bab El Oued" },
  { w: "Oran", c: "Es Senia" },
  { w: "Constantine", c: "El Khroub" },
  { w: "Blida", c: "Blida" },
  { w: "Sétif", c: "El Eulma" },
  { w: "Annaba", c: "El Bouni" },
];

const REVIEW_SNIPPETS = [
  "Fast delivery, product matches the description.",
  "Good value for money. Packaging was solid.",
  "Works as expected. Would buy again.",
  "Responsive seller, item arrived in good condition.",
  "Happy with the purchase overall.",
  "Minor cosmetic issue but functions perfectly.",
  "Exceeded expectations for the price point.",
];

const FEEDBACK_SNIPPETS = [
  "Smooth checkout experience.",
  "Love the catalog layout on mobile.",
  "Search could be a bit faster, otherwise great.",
  "Clear product photos and descriptions.",
];

function argNumber(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`${name}=`));
  if (!raw) return fallback;
  const n = Number(raw.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomPick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)]!;
}

function randomPastDate(maxDaysBack: number) {
  const ms = Date.now() - randomInt(0, maxDaysBack) * 86_400_000 - randomInt(0, 86_400_000);
  return new Date(ms);
}

function sessionKey() {
  const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 18)}`;
  const base = `${SESSION_PREFIX}${suffix}`;
  return base.length <= 64 ? base : base.slice(0, 64);
}

function payloadForEvent(
  eventName: string,
  productLocalId: number,
  productTitle: string
): Record<string, unknown> | null {
  if (eventName === "pa_search") {
    return { query: productTitle.slice(0, 40), product_id: productLocalId };
  }
  if (
    eventName === "pa_product_view" ||
    eventName === "pa_add_to_cart" ||
    eventName === "pa_product_ident"
  ) {
    return { product_id: productLocalId, title: productTitle.slice(0, 120) };
  }
  if (eventName === "pa_image_interaction" || eventName === "pa_image_view_time") {
    return { product_id: productLocalId, index: randomInt(0, 3) };
  }
  if (eventName === "pa_scroll" || eventName === "pa_pointer_click") {
    return { product_id: productLocalId, depth: randomInt(10, 95) };
  }
  if (eventName === "pa_performance") {
    return { product_id: productLocalId, cls: Math.random() * 0.15, lcp_ms: randomInt(900, 3200) };
  }
  return { product_id: productLocalId };
}

function weightedEventName(): string {
  const r = Math.random();
  if (r < 0.22) return "pa_product_view";
  if (r < 0.38) return "pa_scroll";
  if (r < 0.48) return "pa_pointer_hover";
  if (r < 0.56) return "pa_image_interaction";
  if (r < 0.62) return "pa_add_to_cart";
  if (r < 0.68) return "pa_begin_checkout";
  if (r < 0.74) return "pa_purchase";
  if (r < 0.8) return "pa_abandon_checkout";
  if (r < 0.86) return "pa_search";
  return randomPick(PA_EVENT_NAMES);
}

async function clearSimulationData() {
  await db.delete(salesMicroEventTable).where(like(salesMicroEventTable.sessionKey, `${SESSION_PREFIX}%`));

  await db.delete(shoppingSequenceTable).where(like(shoppingSequenceTable.sessionKey, `${SESSION_PREFIX}%`));

  await db
    .delete(assistantSearchTelemetryTable)
    .where(like(assistantSearchTelemetryTable.requestId, `${SESSION_PREFIX}%`));

  await db.delete(siteFeedbackTable).where(like(siteFeedbackTable.comment, "[sim]%"));

  await db.delete(productReviewTable).where(like(productReviewTable.comment, "[sim]%"));

  const simOrders = await db
    .select({ id: costumer_orderTable.id })
    .from(costumer_orderTable)
    .where(eq(costumer_orderTable.note, "[simulation]"));

  const orderIds = simOrders.map((o) => o.id);
  if (orderIds.length > 0) {
    await db
      .delete(costumer_order_to_productTable)
      .where(inArray(costumer_order_to_productTable.orderId, orderIds));
    await db.delete(costumer_orderTable).where(inArray(costumer_orderTable.id, orderIds));
  }
}

async function main() {
  if (hasFlag("--clear")) {
    await clearSimulationData();
    console.log(JSON.stringify({ cleared: true, sessionPrefix: SESSION_PREFIX }, null, 2));
    if (!hasFlag("--refill")) {
      return;
    }
  }

  const dryRun = hasFlag("--dry-run");
  const sessionsPerProduct = argNumber("--sessions-per-product", 10);
  const eventsPerSession = argNumber("--events-per-session", 14);
  const maxEvents = argNumber("--max-events", 60_000);
  const orders = argNumber("--orders", 45);
  const reviewsPerProductMax = argNumber("--reviews-per-product-max", 4);
  const wishlistAdds = argNumber("--wishlist-adds", 40);
  const sequences = argNumber("--sequences", 35);
  const telemetryRows = argNumber("--telemetry", 25);

  const products = await db
    .select({
      id: productsTable.id,
      title: productsTable.title,
      price: productsTable.price,
    })
    .from(productsTable);

  if (products.length === 0) {
    console.log(JSON.stringify({ error: "no_products", message: "No rows in products table." }, null, 2));
    process.exitCode = 1;
    return;
  }

  const users = await db.select({ id: user.id }).from(user).orderBy(desc(user.createdAt)).limit(50);

  if (users.length === 0) {
    console.log(
      JSON.stringify(
        {
          warning: "no_users",
          message: "No users in DB — skipping orders, reviews, wishlist, and site feedback.",
          productCount: products.length,
        },
        null,
        2
      )
    );
  }

  const userIds = users.map((u) => u.id);

  const catalog = products.map((p) => ({
    uuid: p.id,
    title: p.title,
    price: p.price,
    storefrontId: resolveStorefrontProductId(p.title, p.id),
  }));

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          products: catalog.length,
          users: userIds.length,
          planned: {
            sessionsPerProduct,
            eventsPerSession,
            maxEvents,
            orders,
            reviewsPerProductMax,
            wishlistAdds,
            sequences,
            telemetryRows,
          },
        },
        null,
        2
      )
    );
    return;
  }

  let eventsInserted = 0;
  const microBatch: Parameters<typeof insertSalesMicroEvents>[0] = [];

  const flushMicro = async () => {
    if (microBatch.length === 0) return;
    await insertSalesMicroEvents(microBatch.splice(0, microBatch.length));
  };

  for (const p of catalog) {
    if (eventsInserted >= maxEvents) break;
    for (let s = 0; s < sessionsPerProduct; s++) {
      if (eventsInserted >= maxEvents) break;
      const sk = sessionKey();
      const pagePath = `/shop-details?productId=${p.storefrontId}`;
      const n = Math.min(eventsPerSession, maxEvents - eventsInserted);
      for (let i = 0; i < n; i++) {
        const name = weightedEventName();
        const uid = userIds.length ? randomPick(userIds) : null;
        microBatch.push({
          sessionKey: sk,
          userId: uid,
          productLocalId: p.storefrontId,
          productTitle: p.title,
          pagePath,
          referrer: Math.random() < 0.35 ? "https://www.google.com/" : "https://vitrina-store.dz/",
          eventName: name,
          payload: payloadForEvent(name, p.storefrontId, p.title),
          clientEventAt: randomPastDate(21),
          sequenceIndex: i,
        });
        eventsInserted += 1;
        if (microBatch.length >= 250) {
          await flushMicro();
        }
      }
    }
  }
  await flushMicro();

  const statusPool = ["ended_purchase", "ended_left", "ended_purchase", "ended_left", "active"] as const;
  const triggerTypes = ["search", "category", "product"] as const;

  let sequencesInserted = 0;
  for (let i = 0; i < sequences; i++) {
    const p = randomPick(catalog);
    const started = randomPastDate(14);
    const status = randomPick(statusPool);
    const ended =
      status === "active" ? null : new Date(started.getTime() + randomInt(60_000, 2_400_000));
    await db.insert(shoppingSequenceTable).values({
      sessionKey: sessionKey(),
      userId: userIds.length ? randomPick(userIds) : null,
      triggerType: randomPick(triggerTypes),
      triggerLabel: p.title.slice(0, 200),
      status,
      productVisitedAt: new Date(started.getTime() + randomInt(5_000, 120_000)),
      startedAt: started,
      endedAt: ended,
    });
    sequencesInserted += 1;
  }

  await ensureReviewTables();

  let reviewsInserted = 0;
  if (userIds.length) {
    for (const p of catalog) {
      const n = randomInt(0, reviewsPerProductMax);
      for (let i = 0; i < n; i++) {
        await db.insert(productReviewTable).values({
          id: crypto.randomUUID(),
          productLocalId: p.storefrontId,
          productTitle: p.title,
          userId: randomPick(userIds),
          rating: randomInt(3, 5),
          comment: `[sim] ${randomPick(REVIEW_SNIPPETS)}`,
          createdAt: randomPastDate(60),
        });
        reviewsInserted += 1;
      }
    }

    for (let i = 0; i < 12; i++) {
      await db.insert(siteFeedbackTable).values({
        id: crypto.randomUUID(),
        userId: randomPick(userIds),
        rating: randomInt(3, 5),
        comment: `[sim] ${randomPick(FEEDBACK_SNIPPETS)}`,
        createdAt: randomPastDate(90),
      });
    }
  }

  let ordersInserted = 0;
  if (userIds.length) {
    for (let o = 0; o < orders; o++) {
      const lines = randomInt(1, 4);
      const picked = new Set<string>();
      let total = 0;
      while (picked.size < lines) {
        picked.add(randomPick(catalog).uuid);
      }
      const loc = randomPick(WILAYAS);
      const orderRows = await db
        .insert(costumer_orderTable)
        .values({
          userId: randomPick(userIds),
          wilaya: loc.w,
          commune: loc.c,
          note: "[simulation]",
          datetime: randomPastDate(30),
          total: 0,
        })
        .returning({ id: costumer_orderTable.id });

      const orderId = orderRows[0]?.id;
      if (!orderId) continue;

      for (const pid of Array.from(picked)) {
        const pr = catalog.find((c) => c.uuid === pid)!;
        const qty = randomInt(1, 3);
        const line = pr.price * qty;
        total += line;
        await db.insert(costumer_order_to_productTable).values({
          orderId,
          productId: pid,
          quantity: qty,
        });
      }

      await db.update(costumer_orderTable).set({ total }).where(eq(costumer_orderTable.id, orderId));
      ordersInserted += 1;
    }
  }

  let wishlistInserted = 0;
  if (userIds.length) {
    const wishlists = await db
      .select({ id: wishlistTable.id, userId: wishlistTable.userId })
      .from(wishlistTable)
      .where(inArray(wishlistTable.userId, userIds));

    const wishlistByUser = new Map(wishlists.map((w) => [w.userId, w.id]));

    for (const uid of userIds) {
      if (!wishlistByUser.has(uid)) {
        const [row] = await db.insert(wishlistTable).values({ userId: uid }).returning({ id: wishlistTable.id });
        if (row?.id) wishlistByUser.set(uid, row.id);
      }
    }

    for (let w = 0; w < wishlistAdds; w++) {
      const uid = randomPick(userIds);
      const wid = wishlistByUser.get(uid);
      const prod = randomPick(catalog);
      if (!wid) continue;
      try {
        await db
          .insert(wishlist_to_productTable)
          .values({
            wishlistId: wid,
            productId: prod.uuid,
          })
          .onConflictDoNothing();
        wishlistInserted += 1;
      } catch {
        /* ignore */
      }
    }
  }

  for (let t = 0; t < telemetryRows; t++) {
    const p = randomPick(catalog);
    await db.insert(assistantSearchTelemetryTable).values({
      eventType: Math.random() < 0.75 ? "search_query" : "result_click",
      requestId: `${SESSION_PREFIX}${crypto.randomUUID()}`,
      sessionKey: sessionKey(),
      userId: userIds.length ? randomPick(userIds) : null,
      mode: "detail",
      rawQuery: p.title.slice(0, 80),
      normalizedQuery: p.title.toLowerCase().slice(0, 80),
      detectedLanguage: "en",
      provider: "simulation",
      model: "script",
      resultCount: randomInt(0, 8),
      matchedIdsJson: JSON.stringify([p.storefrontId]),
      clickedProductId: Math.random() < 0.4 ? p.storefrontId : null,
      clickedPosition: Math.random() < 0.4 ? randomInt(0, 4) : null,
      createdAt: randomPastDate(14),
    });
  }

  for (const p of catalog) {
    await db
      .update(productsTable)
      .set({
        rating: randomInt(3, 5),
        instock: randomInt(8, 140),
      })
      .where(eq(productsTable.id, p.uuid));
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        products: catalog.length,
        users: userIds.length,
        eventsInserted,
        sequencesInserted,
        reviewsInserted,
        ordersInserted,
        wishlistInserted,
        telemetryInserted: telemetryRows,
        sessionPrefix: SESSION_PREFIX,
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
