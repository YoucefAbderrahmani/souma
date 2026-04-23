/**
 * Builds Souma Store — Full Application Report (print-ready HTML + optional PDF).
 * Run: node scripts/build-souma-application-report.mjs
 * PDF: node scripts/build-souma-application-report.mjs --pdf  (requires playwright)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_HTML = path.join(ROOT, "reports", "Souma-Store-Full-Application-Report.html");
const OUT_PDF = path.join(ROOT, "reports", "Souma-Store-Full-Application-Report.pdf");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function extractSchemaBlocks(schemaSrc) {
  const blocks = [];
  const re = /export const (\w+)\s*=\s*pgTable\s*\(\s*["']([^"']+)["']\s*,\s*\{/g;
  let m;
  while ((m = re.exec(schemaSrc)) !== null) {
    const exportName = m[1];
    const tableName = m[2];
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    for (; i < schemaSrc.length && depth > 0; i++) {
      const ch = schemaSrc[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    const inner = schemaSrc.slice(start, i);
    blocks.push({ exportName, tableName, inner: inner.trim() });
  }
  return blocks;
}

const PAGE_ROUTES = [
  { route: "/", note: "Marketing home, hero, categories, featured products" },
  { route: "/signin", note: "Better Auth sign-in (Google + credentials flows)" },
  { route: "/signup", note: "Account registration" },
  { route: "/forgot-password", note: "Password recovery entry" },
  { route: "/shop-with-sidebar", note: "Catalog grid with sidebar filters" },
  { route: "/shop-without-sidebar", note: "Catalog grid without sidebar" },
  { route: "/shop-details", note: "Product detail (query-driven)" },
  { route: "/category/[slug]", note: "Category landing with product listing" },
  { route: "/cart", note: "Cart review, line items, proceed to checkout" },
  { route: "/checkout", note: "Wilaya/commune, notes, Chargily payment handoff" },
  { route: "/wishlist", note: "Saved products (authenticated)" },
  { route: "/my-account", note: "Profile and account management" },
  { route: "/recently-viewed", note: "Session/history-based product recall" },
  { route: "/contact", note: "Contact form / store information" },
  { route: "/faq", note: "Frequently asked questions" },
  { route: "/terms-of-use", note: "Legal terms" },
  { route: "/privacy-policy", note: "Privacy policy" },
  { route: "/refund-policy", note: "Refund policy" },
  { route: "/mail-success", note: "Post-transaction confirmation" },
  { route: "/error", note: "Error boundary page" },
  { route: "/sequence", note: "Shopping sequence analytics (admin-style view)" },
  { route: "/admin", note: "Administrative tools (sequences, etc.)" },
  { route: "/blogs/blog-grid", note: "Blog index grid" },
  { route: "/blogs/blog-grid-with-sidebar", note: "Blog grid with sidebar" },
  { route: "/blogs/blog-details", note: "Single blog article" },
  { route: "/blogs/blog-details-with-sidebar", note: "Blog article with sidebar" },
];

const API_ROUTES = [
  { path: "/api/auth/[...all]", note: "Better Auth catch-all: session, OAuth callbacks" },
  { path: "/api/assistant", note: "POST: multilingual smart assistant (Gemini / OpenRouter), catalog + LLM ranking" },
  { path: "/api/assistant/telemetry", note: "Assistant search / click telemetry ingestion" },
  { path: "/api/payments/chargily/checkout", note: "Creates Chargily checkout session, redirects" },
  { path: "/api/reviews", note: "Product reviews CRUD / listing" },
  { path: "/api/feedbacks", note: "Site-wide feedback capture" },
  { path: "/api/sequence/start", note: "Starts shopping_sequence funnel row" },
  { path: "/api/sequence/visit-product", note: "Marks product visit within sequence" },
  { path: "/api/sequence/end", note: "Ends sequence (purchase or leave)" },
  { path: "/api/admin/sequences", note: "Admin listing / inspection of sequences" },
];

const USE_CASES = [
  ["UC-01", "Visitor browses home", "Guest", "Views hero, categories, and featured products without signing in."],
  ["UC-02", "Visitor opens shop grid", "Guest", "Navigates to shop-with-sidebar or shop-without-sidebar and scrolls catalog."],
  ["UC-03", "Filter products by category", "Guest", "Uses category chips or category pages to narrow catalog."],
  ["UC-04", "Open product detail", "Guest", "Clicks product card; loads shop-details with images, price modes, description."],
  ["UC-05", "Toggle price mode (detail vs jomla)", "Guest/User", "Global PriceModeProvider switches how list prices are interpreted (reference vs promo)."],
  ["UC-06", "Add to cart", "Guest/User", "Dispatches Redux cart slice; toast feedback; cart badge updates."],
  ["UC-07", "Adjust quantity in cart", "Guest/User", "Updates line quantities with validation against stock fields."],
  ["UC-08", "Remove from cart", "Guest/User", "Removes line item; persists via CartPersistence."],
  ["UC-09", "Persist cart across reload", "Guest/User", "CartPersistence hydrates Redux from storage without flicker."],
  ["UC-10", "Open quick view modal", "Guest/User", "QuickView slice drives modal with product summary."],
  ["UC-11", "Add to wishlist", "User", "Requires session; wishlist tables in Postgres."],
  ["UC-12", "View wishlist", "User", "Dedicated wishlist page lists saved SKUs."],
  ["UC-13", "Sign in with Google", "Guest", "Better Auth + Google OAuth; profile hydrated."],
  ["UC-14", "Sign in with email/password", "Guest", "Credential provider via Better Auth."],
  ["UC-15", "Sign up", "Guest", "Creates user row, verification flags per configuration."],
  ["UC-16", "Forgot password", "Guest", "Initiates recovery flow (provider-dependent)."],
  ["UC-17", "View my account", "User", "Profile, orders history hooks (as implemented)."],
  ["UC-18", "Start checkout", "User/Guest", "Checkout form: wilaya, commune, optional note."],
  ["UC-19", "Pay with Chargily", "User/Guest", "Server creates Chargily session; browser redirects to hosted checkout."],
  ["UC-20", "Return from payment", "User/Guest", "Redirect URLs use NEXT_PUBLIC_APP_URL; order persisted."],
  ["UC-21", "Submit product review", "User", "Reviews API + product_review table."],
  ["UC-22", "Read reviews on product", "Guest/User", "Rendered list with ratings aggregate."],
  ["UC-23", "Submit site feedback", "User", "site_feedback table via API."],
  ["UC-24", "Contact store", "Guest/User", "Contact page messaging (implementation-specific)."],
  ["UC-25", "Read policies", "Guest/User", "Static legal pages: terms, privacy, refund."],
  ["UC-26", "Browse blog", "Guest/User", "Marketing / content pages under /blogs/*."],
  ["UC-27", "FAQ self-service", "Guest/User", "FAQ page reduces support load."],
  ["UC-28", "Recently viewed products", "Guest/User", "recently-viewed page surfaces local/session history."],
  ["UC-29", "Smart shopping assistant (global)", "Guest/User", "Floating assistant; POST /api/assistant; multilingual replies."],
  ["UC-30", "Product page assistant", "Guest/User", "Contextual assistant with on-page product metadata."],
  ["UC-31", "Assistant telemetry — search", "System", "Logs normalized query, provider, model, cache, counts."],
  ["UC-32", "Assistant telemetry — click", "User", "Logs clicked recommendation position for tuning."],
  ["UC-33", "Sequence start", "System", "sequence/start records funnel with trigger metadata."],
  ["UC-34", "Sequence product visit", "System", "visit-product stamps product_visited_at."],
  ["UC-35", "Sequence end purchase", "System", "end marks purchase outcome."],
  ["UC-36", "Sequence end abandon", "System", "end marks left / superseded states."],
  ["UC-37", "Admin inspect sequences", "Admin", "admin/sequences API + UI page."],
  ["UC-38", "Middleware session cookie check", "System", "middleware.ts optimistic redirect for /dashboard matcher."],
  ["UC-39", "Session provider (client)", "Guest/User", "React session context from Better Auth client."],
  ["UC-40", "Image gallery on product", "Guest/User", "Additional images from image table / UI carousel."],
  ["UC-41", "Stock / availability messaging", "Guest/User", "instock field drives availability copy."],
  ["UC-42", "Manufacturer & category display", "Guest/User", "Schema fields rendered in PDP."],
  ["UC-43", "Search normalization (assistant)", "System", "Transliteration + language heuristics before retrieval."],
  ["UC-44", "LLM provider fallback chain", "System", "Gemini primary; OpenRouter configurable; graceful degradation."],
  ["UC-45", "Rate limit user messaging", "Guest/User", "Localized strings when providers throttled."],
  ["UC-46", "Mail success confirmation", "User", "Post-checkout positive acknowledgment page."],
  ["UC-47", "Error page navigation", "Guest/User", "Centralized error UX."],
  ["UC-48", "SEO / metadata per layout", "Guest/User", "Next.js metadata API on routes (as configured)."],
  ["UC-49", "Redux DevTools (dev)", "Developer", "RTK store exposes standard tooling in development."],
  ["UC-50", "Production deploy on Vercel", "Operator", "Serverless functions for API routes; env secrets in project settings."],
  ["UC-51", "Theme toggle (light/dark)", "Guest/User", "next-themes integration where wired in layout."],
  ["UC-52", "Swiper-based merchandising carousels", "Guest/User", "Marketing sliders for collections and promos."],
  ["UC-53", "Category slug resolution", "Guest/User", "Dynamic segment category/[slug] hydrates listing."],
  ["UC-54", "Order line composition", "System", "costumer_order_to_product rows mirror cart at checkout."],
  ["UC-55", "Product images secondary gallery", "Guest/User", "imageTable joins power additional PDP media."],
  ["UC-56", "Phone uniqueness enforcement", "System", "user.phone unique constraint supports support desk lookups."],
  ["UC-57", "Role field on user", "System", "Default user role; extensible for admin elevation."],
  ["UC-58", "Session expiry handling", "User", "Better Auth session rows with expires_at semantics."],
  ["UC-59", "OAuth account linkage", "User", "account table stores provider tokens per Better Auth model."],
  ["UC-60", "Email verification flags", "User", "email_verified boolean on user as per adapter mapping."],
  ["UC-61", "Verification tokens", "System", "verification table for magic links / OTP flows."],
  ["UC-62", "Assistant detail vs jomla mode", "Guest/User", "mode flag steers catalog matching and pricing context."],
  ["UC-63", "Assistant empty-query guard", "Guest/User", "Localized prompt when query blank."],
  ["UC-64", "Assistant catalog fallback", "System", "Deterministic retrieval when LLM unavailable."],
  ["UC-65", "Assistant response cache", "System", "In-memory TTL map keyed by normalized query."],
  ["UC-66", "Sequence superseded state", "System", "New funnel run marks prior rows superseded."],
  ["UC-67", "Sequence trigger taxonomy", "Operator", "trigger_type + trigger_label explain entry points."],
  ["UC-68", "Admin sequences JSON export mindset", "Admin", "Rows consumable by BI pipelines (future)."],
  ["UC-69", "Checkout shipping method display", "Guest/User", "Yalidine Express branding in ShippingMethod UI."],
  ["UC-70", "Hydration-safe cart badge", "Guest/User", "Client-only counts after persistence hydration."],
  ["UC-71", "Product local id in reviews", "System", "Legacy/local id field aligns reviews with catalog rows."],
  ["UC-72", "Strikethrough reference pricing", "Guest/User", "When jomlaPrice set, UI shows reference + promo story."],
  ["UC-73", "Manufacturer trust signal", "Guest/User", "manufacturer field displayed on PDP."],
  ["UC-74", "Low-stock edge messaging", "Guest/User", "instock thresholds can inform urgency copy."],
  ["UC-75", "404 / error recovery", "Guest/User", "Dedicated error page route."],
  ["UC-76", "Mail success analytics hook", "Operator", "Confirmation page can attach conversion pixels."],
  ["UC-77", "Contact lead capture", "Guest/User", "Inbound inquiries for B2B or support."],
  ["UC-78", "FAQ reduces tickets", "Guest/User", "Self-serve answers before human support."],
  ["UC-79", "Blog SEO landing", "Guest/User", "Long-form content attracts organic traffic."],
  ["UC-80", "Policy audit trail", "Compliance", "Static pages demonstrate consumer disclosures."],
];

const RISKS = [
  ["R-01", "Payment integration", "Third-party Chargily availability and webhook timing must be monitored.", "High", "Retries, idempotent order writes, alerting"],
  ["R-02", "LLM cost & abuse", "Assistant endpoints can incur token cost; prompt injection surface.", "Medium", "Rate limits, max tokens, query sanitization"],
  ["R-03", "Auth middleware comment", "Code notes cookie check is optimistic; routes must re-validate.", "Medium", "Central requireAuth helper for sensitive APIs"],
  ["R-04", "PII in telemetry", "Assistant telemetry stores queries; retention policy needed.", "Medium", "TTL cleanup, anonymization"],
  ["R-05", "Stock oversell", "Race between cart and checkout vs inventory.", "Medium", "Transactional stock decrement"],
  ["R-06", "Env misconfiguration", "Missing GOOGLE_API_KEY / OPENROUTER degrades assistant.", "Low", "Health check + UI copy"],
  ["R-07", "Database migrations", "Drift between drizzle and production schema.", "Medium", "CI migration gate"],
  ["R-08", "Third-party LLM availability", "Provider outages affect assistant quality.", "Medium", "Multi-provider fallback, cached fallbacks"],
  ["R-09", "Client bundle size", "Heavy client islands can regress LCP.", "Low", "Code-split assistants, lazy modals"],
];

function listSourceIndexRows(srcRoot) {
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const name = ent.name;
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = path.join(dir, name);
      if (ent.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) {
        const rel = path.relative(ROOT, full).replace(/\\/g, "/");
        files.push(rel);
      }
    }
  }
  walk(srcRoot);
  files.sort();
  function inferRole(rel) {
    if (rel.includes("/app/api/")) return "Route Handler (API)";
    if (/\/app\/.*\/page\.tsx$/.test(rel)) return "App Router page";
    if (/\/app\/.*\/layout\.tsx$/.test(rel)) return "App Router layout";
    if (rel.includes("/app/") && rel.endsWith("route.ts")) return "Route Handler";
    if (rel.includes("/components/")) return "React component / UI";
    if (rel.includes("/server/")) return "Server, auth, or data access";
    if (rel.includes("/redux/")) return "Redux slice or store";
    if (rel.includes("/lib/")) return "Client or shared library";
    if (rel.includes("/hooks/")) return "React hook";
    if (rel.includes("/use-cases/")) return "Application use case";
    if (rel.includes("/types/")) return "Type definitions";
    return "TypeScript module";
  }
  return [["Path (under repo)", "Classification"], ...files.map((f) => [f, inferRole(f)])];
}

function chapter(num, title, bodyHtml) {
  return `
  <section class="chapter" id="ch-${num}">
    <div class="chapter-kicker">Chapter ${num}</div>
    <h2>${escapeHtml(title)}</h2>
    ${bodyHtml}
  </section>`;
}

function appendixTable(title, rows, opts = {}) {
  const cls = opts.compact ? " data data--compact" : " data";
  const head = rows[0].map(escapeHtml).map((c) => `<th>${c}</th>`).join("");
  const body = rows
    .slice(1)
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`
    )
    .join("");
  return `
  <section class="appendix-block">
    <h3>${escapeHtml(title)}</h3>
    <table class="${cls.trim()}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </section>`;
}

function buildDiagramSystemContext() {
  return `
  <figure class="diagram">
    <figcaption>Figure 1 — System context (C4 Level 1)</figcaption>
    <pre class="ascii">
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SOUMA STORE (Next.js)                           │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌────────────────┐ │
│  │ App Router  │   │ Redux client │   │ Better Auth │   │ Smart Assistant│ │
│  │ pages + RSC │   │ cart/wishlist│   │ sessions    │   │ Gemini / OR    │ │
│  └──────┬──────┘   └──────┬───────┘   └──────┬──────┘   └───────┬────────┘ │
│         │                 │                 │                  │            │
│         └────────────────┬┴─────────────────┴──────────────────┘            │
│                          │                                                  │
│                   Server Actions / Route Handlers                           │
└───────────────────────────┼──────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼────────────────────┐
        ▼                   ▼                    ▼
 ┌─────────────┐    ┌──────────────┐     ┌───────────────┐
 │ PostgreSQL │    │ Chargily Pay │     │ Google OAuth │
 │ (Drizzle)  │    │ (hosted)     │     │ (identity)   │
 └─────────────┘    └──────────────┘     └───────────────┘
  </pre>
  </figure>`;
}

function buildDiagramRequestFlow() {
  return `
  <figure class="diagram">
    <figcaption>Figure 2 — Checkout & payment sequence</figcaption>
    <pre class="ascii">
Customer          Browser (Next)              API Route                Chargily
   │                  │                          │                        │
   │──cart review────►│                          │                        │
   │──checkout form──►│                          │                        │
   │──submit─────────►│──POST checkout─────────►│                        │
   │                  │                          │──create session──────►│
   │◄──redirect URL───│◄─────────────────────────│                        │
   │──hosted checkout─────────────────────────────────────────────────────►│
   │◄──return / webhook (as configured)────────────────────────────────────│
  </pre>
  </figure>`;
}

function buildDiagramAssistant() {
  return `
  <figure class="diagram">
    <figcaption>Figure 4 — Assistant request pipeline (conceptual)</figcaption>
    <pre class="ascii">
Browser (assistant UI)                API /api/assistant                    Providers
        │                                      │                              │
        │── POST { query, mode, context }──────►│── auth / session (optional)──┤
        │                                      │── normalize + detect locale──►│
        │                                      │── catalog retrieve / scores   │
        │                                      │── LLM JSON (matches+summary)─►│ Gemini / OpenRouter
        │                                      │── merge + cache (TTL 5m)        │
        │◄── JSON matches + summary + meta─────│── telemetry row (async)────────►│ Postgres telemetry
  </pre>
  </figure>`;
}

function buildDiagramData() {
  return `
  <figure class="diagram">
    <figcaption>Figure 3 — Core entity relationships (simplified)</figcaption>
    <pre class="ascii">
  ┌──────user──────┐       ┌────wishlist────┐     ┌────wishlist_to_product───┐
  │ id (PK)       │◄──────│ userId (FK,U) │────►│ wishlistId + productId   │
  │ email, phone… │       └───────────────┘     └───────────┬──────────────┘
  └───────┬────────┘                                        │
          │                                                 ▼
          │                                      ┌────products────┐
          ├─────────────────────────────────────►│ categoryId FK│
          │                                      └────┬───────────┘
          │                                           │
          ▼                                           ▼
  ┌────────costumer_order────────┐            ┌────image────┐
  │ wilaya, commune, total, …    │            │ productId   │
  └───────────┬──────────────────┘            └─────────────┘
              │
              ▼
  ┌────────costumer_order_to_product────────┐
  │ orderId + productId (composite PK)      │
  └─────────────────────────────────────────┘
  </pre>
  </figure>`;
}

function buildHtml({ generatedAt, schemaBlocks, envExample, sourceIndexRows }) {
  const schemaAppendix = schemaBlocks
    .map(
      (b) => `
    <section class="schema-table">
      <h4>Table <code>${escapeHtml(b.tableName)}</code> <span class="muted">(${escapeHtml(b.exportName)})</span></h4>
      <pre class="code">${escapeHtml(b.inner.slice(0, 12000))}</pre>
    </section>`
    )
    .join("\n");

  const ucRows = [["ID", "Name", "Primary actor", "Brief description"], ...USE_CASES];

  const riskRows = [["ID", "Area", "Description", "Severity", "Mitigation"], ...RISKS];

  const pageRows = [["Route", "Description"], ...PAGE_ROUTES.map((p) => [p.route, p.note])];

  const apiRows = [["Path", "Description"], ...API_ROUTES.map((a) => [a.path, a.note])];

  const TOC_TITLES = [
    "Executive summary",
    "Vision, positioning, and conception",
    "Stakeholders and personas",
    "Functional scope overview",
    "Quality attributes (non-functional requirements)",
    "Solution architecture",
    "Frontend architecture (App Router)",
    "State management",
    "Authentication and sessions",
    "Commerce, pricing modes, and inventory",
    "Checkout, logistics fields, and payments",
    "AI assistants: behavior and safeguards",
    "Analytics: shopping sequences",
    "Data architecture and persistence",
    "API surface (summary)",
    "Security, privacy, and compliance posture",
    "Deployment model",
    "Testing strategy (recommendations)",
    "Roadmap themes",
    "Internationalization, locales, and assistant copy decks",
    "Repository layout and layering conventions",
    "Catalog data model and shop presentation",
    "Product detail page: composition and assistants",
    "Cart, persistence, and client state lifecycle",
    "Checkout UX: wilaya, commune, shipping presentation",
    "Payments: Chargily integration principles",
    "Wishlist domain model and UX",
    "Reviews, ratings, and moderation considerations",
    "Site feedback instrument",
    "Blog subsystem and editorial workflow",
    "Legal, trust, and policy surfaces",
    "Performance engineering checklist",
    "Accessibility baseline",
    "Engineering process: migrations, typing, and CI",
    "Glossary and extended definitions",
  ];

  const bodyChapters =
    chapter(
      1,
      "Executive summary",
      `<p class="lead">Souma Store is a production-grade e-commerce experience built on <strong>Next.js 15</strong> and <strong>React 19</strong>, combining a rich merchandising front end, authenticated accounts, Algerian-market checkout (wilaya/commune), <strong>Chargily</strong> payments, and an <strong>AI-assisted shopping layer</strong> with multilingual responses and telemetry for continuous improvement.</p>
      <p>This document narrates the product from conception through architecture, data design, operational concerns, and a structured catalog of use cases suitable for stakeholders, engineers, and auditors. Diagrams use plain figures so they render reliably in PDF engines.</p>
      <ul class="tight"><li><strong>Primary runtime:</strong> Node.js serverless (Vercel-style) with Route Handlers.</li><li><strong>Persistence:</strong> PostgreSQL via Drizzle ORM.</li><li><strong>Auth:</strong> Better Auth with Google OAuth and credential flows.</li><li><strong>State:</strong> Redux Toolkit for cart, wishlist, quick view, product-details UI.</li><li><strong>Intelligence:</strong> Google Gemini and/or OpenRouter-backed flows with catalog grounding.</li></ul>`
    ) +
    chapter(
      2,
      "Vision, positioning, and conception",
      `<p>Souma targets a modern, mobile-first storefront with editorial polish: large imagery, confident typography, and fast interaction patterns (quick view, sticky assistant, expressive product pages). Conception emphasized three pillars: <em>trust</em> (clear pricing modes, policies, reviews), <em>speed</em> (client caching patterns, optimistic UI), and <em>insight</em> (shopping sequences + assistant telemetry).</p>
      <p>The name and visual language evoke warmth and energy—orange accents on deep navy—while keeping commerce flows conventional so new shoppers remain oriented.</p>
      <blockquote>Design principle: progressive disclosure. Advanced modes (jomla pricing, assistant) enhance the core journey without blocking basic browse-to-buy.</blockquote>`
    ) +
    chapter(
      3,
      "Stakeholders and personas",
      `<p><strong>Guests</strong> discover the catalog, compare prices, and may purchase depending on checkout configuration. <strong>Registered users</strong> retain wishlists, reviews, and personalized surfaces. <strong>Operators</strong> monitor sequences and assistant metrics. <strong>Developers</strong> extend Drizzle models, API routes, and UI modules within the App Router structure.</p>`
    ) +
    chapter(
      4,
      "Functional scope overview",
      `<p>Major domains include catalog browsing, product detail, cart, checkout + payment, wishlist, authentication, blogs and static content, feedback and reviews, admin sequence analytics, and AI assistants (global + product-scoped).</p>`
    ) +
    chapter(
      5,
      "Quality attributes (non-functional requirements)",
      `<table class="data"><thead><tr><th>Attribute</th><th>Target behavior</th><th>Implementation notes</th></tr></thead><tbody>
      <tr><td>Performance</td><td>Fast TTFB on static segments; responsive interactions</td><td>Next.js streaming, image optimization, minimal client JS on content pages</td></tr>
      <tr><td>Security</td><td>Session integrity; server-side payment creation</td><td>Better Auth, server-only secrets, Chargily server API</td></tr>
      <tr><td>Maintainability</td><td>Typed end-to-end</td><td>TypeScript, Drizzle schema as source of truth</td></tr>
      <tr><td>Observability</td><td>Funnel and assistant metrics</td><td>shopping_sequence + assistant_search_telemetry tables</td></tr>
      <tr><td>i18n readiness</td><td>Assistant speaks ar/fr/en/dz</td><td>Locale heuristics + template banks in route handler</td></tr>
      </tbody></table>`
    ) +
    chapter(
      6,
      "Solution architecture",
      `<p>The system follows a modular monolith pattern: a single deployable Next.js application containing UI, API routes, and server libraries. External systems are limited to well-bounded integrations (payments, LLM providers, OAuth).</p>
      ${buildDiagramSystemContext()}
      <p><strong>Edge vs Node:</strong> Middleware performs a narrow cookie presence check for matched paths; sensitive authorization should still occur in server components or route handlers per Better Auth guidance.</p>`
    ) +
    chapter(
      7,
      "Frontend architecture (App Router)",
      `<p>Routes live under <code>src/app/(site)</code> with nested layouts supplying session, theme, Redux <code>Provider</code>, cart persistence, modals, and assistant shells. Pages remain mostly server components where feasible; interactive islands mount client components for cart, swiper carousels, and assistants.</p>
      <ul class="tight"><li><strong>Layouts:</strong> shared chrome, fonts, analytics hooks (as present).</li><li><strong>Composition:</strong> <code>components/</code> tree mirrors domains: Shop, Checkout, Cart, Common.</li><li><strong>Styling:</strong> Tailwind CSS utility system with design tokens in tailwind config.</li></ul>`
    ) +
    chapter(
      8,
      "State management",
      `<p>Redux Toolkit configures reducers for quick view, cart, wishlist, and product-details slices. Selectors are typed via <code>useAppSelector</code>. Cart persistence bridges storage and the store to avoid hydration mismatch and flicker.</p>`
    ) +
    chapter(
      9,
      "Authentication and sessions",
      `<p>Better Auth is instantiated in <code>src/server/lib/auth.ts</code> with Drizzle adapter, custom session enrichment (e.g., phone, image lookups), Google provider, and trusted origins derived from environment. Client helpers live in <code>src/lib/auth-client.ts</code>.</p>`
    ) +
    chapter(
      10,
      "Commerce, pricing modes, and inventory",
      `<p>Products carry list and optional promotional (<em>jomla</em>) prices with business rules documented in schema comments. Availability uses numeric stock representation suitable for extension to quantity-based fulfillment.</p>`
    ) +
    chapter(
      11,
      "Checkout, logistics fields, and payments",
      `<p>Checkout captures Algerian administrative geography (wilaya, commune) and optional customer notes. Payment initiation occurs server-side through Chargily’s REST API; the browser is redirected to hosted checkout, minimizing PCI scope on Souma infrastructure.</p>
      ${buildDiagramRequestFlow()}`
    ) +
    chapter(
      12,
      "AI assistants: behavior and safeguards",
      `<p>The assistant route loads the in-repo catalog (<code>shopData</code>), normalizes queries (including transliteration), optionally calls Gemini 2.0 Flash and/or OpenRouter models, merges LLM scores with deterministic signals, caches hot responses for five minutes, and returns structured matches plus a natural-language summary. Missing API keys produce clear, localized guidance rather than opaque failures.</p>
      <p>Telemetry captures request identifiers, provider metadata, cache status, matched identifiers, and click-through events for offline evaluation.</p>
      ${buildDiagramAssistant()}`
    ) +
    chapter(
      13,
      "Analytics: shopping sequences",
      `<p>The <code>shopping_sequence</code> entity records session-keyed funnels with trigger labels, lifecycle status, and timestamps for product visits and endings. Admin APIs expose these rows for operational review.</p>`
    ) +
    chapter(
      14,
      "Data architecture and persistence",
      `<p>PostgreSQL holds canonical commerce entities, Better Auth tables, reviews, feedback, sequences, and assistant telemetry. Drizzle migrations under <code>drizzle/</code> version additive changes.</p>
      ${buildDiagramData()}`
    ) +
    chapter(
      15,
      "API surface (summary)",
      `<p>Server routes are implemented as Next.js Route Handlers returning JSON or redirects. The appendix lists every discovered route file in this repository snapshot.</p>`
    ) +
    chapter(
      16,
      "Security, privacy, and compliance posture",
      `<p>Secrets never ship to the client bundle. OAuth uses Google web client credentials. Payment secrets are server-only. Telemetry may contain search text—treat as sensitive operational data with retention controls.</p>`
    ) +
    chapter(
      17,
      "Deployment model",
      `<p>Typical deployment targets Vercel or compatible platforms with environment variables mirroring <code>.env.example</code>. Database connectivity uses pooled Postgres URLs suitable for serverless drivers.</p>`
    ) +
    chapter(
      18,
      "Testing strategy (recommendations)",
      `<p>Recommended layers: unit tests for pure utilities (price math, normalization), contract tests for Route Handlers with mocked Drizzle, Playwright smoke for checkout happy-path in staging, and periodic load tests on assistant endpoints.</p>
      <p><strong>Regression matrix (starter).</strong> Cart persistence across reload; assistant with keys absent/present; OAuth callback on localhost vs production origin; Chargily redirect URLs with and without trailing slashes; sequence lifecycle when user opens multiple tabs; wishlist FK cascade on user delete.</p>
      <p><strong>Test data hygiene.</strong> Use disposable Postgres schemas or docker-compose for CI, seed minimal categories/products, and rotate OAuth test users to avoid rate limits on Google’s consent screen during automated runs.</p>`
    ) +
    chapter(
      19,
      "Roadmap themes",
      `<ol class="tight"><li>Hardening auth gates on admin paths</li><li>Inventory reservation service</li><li>Richer CMS for blogs</li><li>Assistant evaluation dashboard</li><li>Webhook-driven order fulfillment status</li></ol>
      <p>Each theme should ship with measurable KPIs: e.g., assistant NDCG@k on held-out queries, checkout conversion rate by wilaya, median time-to-first-byte on PDP, and error budget for payment callbacks.</p>`
    ) +
    chapter(
      20,
      "Internationalization, locales, and assistant copy decks",
      `<p>Souma’s customer-facing UI is predominantly French/Arabic/Darija-friendly in merchandising copy, while the assistant route codifies <strong>four response locales</strong>—Modern Standard Arabic, French, Algerian Darija (Latin), and English—selected by script detection, provider-reported language, and regex heuristics tuned for Maghrebi French and Darija markers.</p>
      <p>Template banks centralize operational messages (missing API keys, rate limits, empty queries, catalog-only fallback). This pattern keeps UX consistent even when the LLM narrative varies, and simplifies legal review of deterministic strings.</p>
      <p>Future i18n work could externalize UI strings into message catalogs (e.g., next-intl) while preserving assistant locale detection as a separate concern from static chrome translation.</p>`
    ) +
    chapter(
      21,
      "Repository layout and layering conventions",
      `<p>The repository follows a pragmatic vertical slice: <code>src/app</code> for routing and route handlers, <code>src/components</code> for UI modules grouped by domain (Shop, Checkout, Cart, Common), <code>src/server</code> for auth/db/data-access, <code>src/redux</code> for client state, and <code>src/lib</code> for cross-cutting utilities. This mirrors how teams onboard: start at a route, descend into components, drop to server helpers when persistence is involved.</p>
      <p>Keeping Drizzle schema centralized avoids drift between “types” and “truth”. Migrations in <code>drizzle/*.sql</code> should be treated as immutable history once applied to production.</p>`
    ) +
    chapter(
      22,
      "Catalog data model and shop presentation",
      `<p>Products are relational rows with slugs for clean URLs, joined categories, and optional promotional pricing. The storefront also consumes curated <code>shopData</code> for deterministic assistant retrieval—an intentional dual path: relational data for transactional integrity, curated JSON for fast LLM grounding without N+1 queries at inference time.</p>
      <p>Merchandising components emphasize photography, manufacturer, and category breadcrumbs to reduce uncertainty before add-to-cart.</p>`
    ) +
    chapter(
      23,
      "Product detail page: composition and assistants",
      `<p>The PDP composes gallery, price modes, description, reviews, and contextual assistant entry points. Product-scoped assistant payloads include title, availability hints, and category to steer retrieval toward compatible substitutes and accessories.</p>
      <p>Separating global assistant chrome from PDP assistant reduces accidental context leakage and improves relevance metrics in telemetry.</p>`
    ) +
    chapter(
      24,
      "Cart, persistence, and client state lifecycle",
      `<p>Redux holds authoritative client cart state; persistence middleware writes through to storage after meaningful transitions. Hydration strategies must avoid double-counting during SSR handoff—Souma’s approach favors client reconciliation with stable keys to prevent flicker when session state and anonymous carts meet at login.</p>`
    ) +
    chapter(
      25,
      "Checkout UX: wilaya, commune, shipping presentation",
      `<p>Algerian wilaya and commune fields align with last-mile carrier expectations. The checkout surface presents <strong>Yalidine Express</strong> branding in the shipping method presentation layer, signaling fulfillment partner intent to shoppers even when rate tables are simplified in early versions.</p>`
    ) +
    chapter(
      26,
      "Payments: Chargily integration principles",
      `<p>Server-created checkout sessions ensure secrets never leave trusted compute. Amounts and success/failure URLs should be derived from trusted cart recomputation on the server, not from client-submitted totals alone. Idempotency keys for order creation pair naturally with payment intent identifiers.</p>`
    ) +
    chapter(
      27,
      "Wishlist domain model and UX",
      `<p>Wishlists are modeled as one row per user with a join table for products, enabling efficient uniqueness constraints and cascade deletes. UX surfaces highlight saved items and nudge conversion through return visits.</p>`
    ) +
    chapter(
      28,
      "Reviews, ratings, and moderation considerations",
      `<p>Reviews bind to users and carry integer ratings and free-text comments. Moderation policies (profanity filters, report button, admin quarantine) are organizational choices; technically the schema supports append-only consumer history suitable for audit.</p>`
    ) +
    chapter(
      29,
      "Site feedback instrument",
      `<p>Holistic site feedback complements product reviews by capturing satisfaction with navigation, speed, and support. Aggregating feedback alongside assistant telemetry can explain macro conversion changes.</p>`
    ) +
    chapter(
      30,
      "Blog subsystem and editorial workflow",
      `<p>Blog routes provide editorial grid/detail layouts with optional sidebars for long-form storytelling—useful for launches, lookbooks, and merchant education. A headless CMS integration would be a natural evolution without changing public URLs.</p>`
    ) +
    chapter(
      31,
      "Legal, trust, and policy surfaces",
      `<p>Terms, privacy, and refund policies establish baseline consumer trust. These pages should be versioned in git with change logs when material terms shift (returns window, data retention, payment dispute flows).</p>`
    ) +
    chapter(
      32,
      "Performance engineering checklist",
      `<ul class="tight"><li>Image formats and sizes for hero and PDP galleries</li><li>Defer non-critical assistant bundles until interaction</li><li>Memoize expensive selectors; avoid rerendering entire grids on cart tick</li><li>Prefer server components for static policy pages</li><li>Monitor API cold starts on Vercel for assistant route</li></ul>`
    ) +
    chapter(
      33,
      "Accessibility baseline",
      `<p>Semantic landmarks, focus management for modals (quick view, assistant), sufficient color contrast on navy backgrounds, and keyboard operability for primary CTAs are baseline expectations. Automated checks (axe) plus manual screen reader passes on checkout are recommended before major releases.</p>`
    ) +
    chapter(
      34,
      "Engineering process: migrations, typing, and CI",
      `<p>Adopt a migration-first workflow: local <code>drizzle-kit generate</code> after schema edits, peer review SQL, apply in staging, snapshot restore drills before production. TypeScript strictness should ratchet over time; new modules should avoid <code>any</code> in auth and payment boundaries.</p>`
    ) +
    chapter(
      35,
      "Glossary and extended definitions",
      `<dl class="glossary">
        <dt>App Router</dt><dd>Next.js file-system routing with layouts and nested loading boundaries.</dd>
        <dt>Better Auth</dt><dd>Library handling sessions, OAuth, and credential storage with Drizzle adapter.</dd>
        <dt>Chargily</dt><dd>Regional payment gateway integration used for hosted checkout.</dd>
        <dt>Drizzle</dt><dd>Type-safe SQL builder and migration toolkit for Postgres.</dd>
        <dt>jomla</dt><dd>Promotional price mode per Souma business rules.</dd>
        <dt>Route Handler</dt><dd><code>route.ts</code> file exporting HTTP method functions in the App Router.</dd>
        <dt>shopping_sequence</dt><dd>Funnel analytics entity keyed by session with lifecycle statuses.</dd>
        <dt>telemetry</dt><dd>Assistant search and click events stored for offline evaluation.</dd>
      </dl>`
    );

  const appendices =
    appendixTable("Appendix A — Primary page routes", pageRows) +
    appendixTable("Appendix B — API route handlers (inventory)", apiRows) +
    appendixTable("Appendix C — Use case catalog", ucRows) +
    appendixTable("Appendix D — Risk register (excerpt)", riskRows) +
    `<section class="appendix-block"><h3>Appendix E — Environment template (<code>.env.example</code>)</h3><pre class="code">${escapeHtml(envExample)}</pre></section>` +
    `<section class="appendix-block page-break-before"><h3>Appendix F — Drizzle schema excerpts (generated)</h3><p class="muted">Column bodies are copied from <code>src/server/db/schema.ts</code> for audit traceability. Composite keys and references appear as declared in source.</p>${schemaAppendix}</section>` +
    appendixTable("Appendix G — Source file index (generated from disk)", sourceIndexRows, {
      compact: true,
    });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Souma Store — Full Application Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet" />
  <style>
    :root {
      --ink: #0b1220;
      --muted: #475569;
      --line: #e2e8f0;
      --accent: #ea580c;
      --accent-2: #fb923c;
      --paper: #ffffff;
      --wash: #f8fafc;
      --radius: 14px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Source Serif 4", Georgia, serif;
      color: var(--ink);
      background: var(--paper);
      font-size: 11.2pt;
      line-height: 1.55;
    }
    h1, h2, h3, h4, .chapter-kicker, .cover-brand, .toc-title {
      font-family: "DM Sans", system-ui, sans-serif;
    }
    .cover {
      min-height: 100vh;
      padding: 8rem 10% 4rem;
      background: radial-gradient(1200px 600px at 80% -10%, rgba(251,146,60,.35), transparent 55%),
                  radial-gradient(900px 500px at 10% 20%, rgba(14,165,233,.18), transparent 50%),
                  linear-gradient(135deg, #0b1220 0%, #0f172a 42%, #1e293b 100%);
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .cover-brand { letter-spacing: .28em; text-transform: uppercase; font-size: .78rem; opacity: .85; }
    .cover h1 {
      font-size: clamp(2.4rem, 4vw, 3.6rem);
      line-height: 1.08;
      margin: 1.2rem 0 .6rem;
      max-width: 14ch;
    }
    .cover .subtitle {
      font-size: 1.15rem;
      opacity: .92;
      max-width: 36ch;
    }
    .cover-meta {
      display: grid;
      gap: .35rem;
      font-size: .95rem;
      opacity: .85;
      margin-top: 3rem;
    }
    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: .5rem;
      padding: .45rem .85rem;
      border-radius: 999px;
      background: rgba(248,250,252,.12);
      border: 1px solid rgba(248,250,252,.22);
      width: fit-content;
      font-family: "DM Sans", sans-serif;
      font-size: .82rem;
    }
    .cover-badge span { color: var(--accent-2); font-weight: 700; }
    .document {
      padding: 0 10% 4rem;
    }
    .abstract {
      margin: 2.5rem 0 2rem;
      padding: 1.25rem 1.5rem;
      border-radius: var(--radius);
      background: var(--wash);
      border: 1px solid var(--line);
    }
    .toc {
      page-break-after: always;
      margin: 2rem 0 3rem;
    }
    .toc-title {
      font-size: 1.6rem;
      margin-bottom: 1rem;
    }
    .toc ol { columns: 2; gap: 2.5rem; padding-left: 1.1rem; }
    .toc li { margin: .35rem 0; }
    .toc a { color: var(--accent); text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    .chapter {
      margin: 2.25rem 0 2.75rem;
    }
    .chapter-kicker {
      color: var(--accent);
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
      font-size: .72rem;
      margin-bottom: .35rem;
    }
    h2 {
      font-size: 1.55rem;
      margin: 0 0 1rem;
      padding-bottom: .5rem;
      border-bottom: 3px solid rgba(234,88,12,.35);
    }
    h3 { font-size: 1.15rem; margin-top: 1.5rem; }
    h4 { font-size: 1rem; margin: 1.25rem 0 .5rem; }
    .lead { font-size: 1.08rem; }
    ul.tight, ol.tight { margin: .75rem 0; padding-left: 1.2rem; }
    ul.tight li, ol.tight li { margin: .35rem 0; }
    blockquote {
      margin: 1.25rem 0;
      padding: 1rem 1.1rem;
      border-left: 4px solid var(--accent);
      background: #fff7ed;
      font-style: italic;
    }
    .diagram {
      margin: 1.25rem 0;
      padding: 1rem 1rem 1.1rem;
      border-radius: var(--radius);
      border: 1px solid var(--line);
      background: linear-gradient(180deg, #ffffff, #f8fafc);
    }
    .diagram figcaption {
      font-family: "DM Sans", sans-serif;
      font-weight: 600;
      font-size: .9rem;
      margin-bottom: .75rem;
    }
    pre.ascii {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 8.6pt;
      line-height: 1.35;
      overflow: auto;
      margin: 0;
    }
    pre.code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 8.8pt;
      line-height: 1.45;
      padding: .85rem 1rem;
      background: #0b1220;
      color: #e2e8f0;
      border-radius: 10px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    table.data {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.8pt;
      margin: .75rem 0 1.25rem;
    }
    table.data th, table.data td {
      border: 1px solid var(--line);
      padding: .45rem .5rem;
      vertical-align: top;
    }
    table.data thead th {
      background: #0f172a;
      color: #f8fafc;
      font-family: "DM Sans", sans-serif;
      font-weight: 600;
    }
    table.data tbody tr:nth-child(even) { background: #f8fafc; }
    table.data--compact { font-size: 8.4pt; }
    table.data--compact th, table.data--compact td { padding: .28rem .35rem; }
    .muted { color: var(--muted); font-weight: 400; }
    .appendix-block { margin: 2rem 0; page-break-inside: avoid; }
    .schema-table { margin: 1.5rem 0; page-break-inside: auto; }
    dl.glossary dt { font-weight: 700; margin-top: .75rem; }
    dl.glossary dd { margin: .25rem 0 0 0; }
    .colophon {
      font-size: .85rem;
      color: var(--muted);
      margin-top: 3rem;
      page-break-before: always;
    }
    @media print {
      @page { size: A4; margin: 16mm 14mm 18mm 14mm; }
      body { font-size: 10.6pt; }
      .cover { min-height: auto; padding: 3rem 8%; }
      a[href^="http"]::after { content: ""; }
      .page-break-before { page-break-before: always; }
      .chapter { page-break-before: always; }
      .chapter:first-of-type { page-break-before: auto; }
      pre.code { white-space: pre-wrap; }
    }
  </style>
</head>
<body>
  <header class="cover">
    <div>
      <div class="cover-brand">Souma</div>
      <h1>Full application report</h1>
      <p class="subtitle">From product conception to architecture, integrations, data design, assistants, and operational readiness — print edition.</p>
      <div class="cover-badge">Generated <span>${escapeHtml(generatedAt)}</span> · Confidential draft</div>
    </div>
    <div class="cover-meta">
      <div>Repository: <strong>souma-store</strong> (Next.js App Router)</div>
      <div>Document class: technical + product narrative</div>
      <div>Estimated print length: ~65–85 pages (engine, margins, and source tree size)</div>
    </div>
  </header>

  <main class="document">
    <section class="abstract">
      <h2 style="border:none;padding:0;margin:0 0 .5rem;">Abstract</h2>
      <p>This report consolidates the Souma Store application as implemented in source: user journeys, route map, API inventory, persistence model, AI features, and risk-aware recommendations. It is suitable as an onboarding artifact, design review appendix, or lightweight compliance pack when paired with your organization’s policies.</p>
    </section>

    <nav class="toc">
      <div class="toc-title">Table of contents</div>
      <ol>
        ${TOC_TITLES.map((t, i) => {
          const n = i + 1;
          return `<li><a href="#ch-${n}">${n}. ${escapeHtml(t)}</a></li>`;
        }).join("")}
        <li><a href="#appendices">Appendices (routes, APIs, use cases, risks, env, schema, source index)</a></li>
      </ol>
    </nav>

    ${bodyChapters}

    <section id="appendices" class="page-break-before">
      <h2>Appendices</h2>
      <p class="muted">Detailed tables and schema excerpts follow. These sections intentionally mirror repository structure to keep the report auditable against git history.</p>
      ${appendices}
    </section>

    <section class="colophon">
      <p><strong>Colophon.</strong> Typography pairs DM Sans (headings, UI) with Source Serif 4 (body). Diagrams are ASCII for universal PDF fidelity. To regenerate: <code>node scripts/build-souma-application-report.mjs</code> then <code>node scripts/build-souma-application-report.mjs --pdf</code> with Playwright installed.</p>
    </section>
  </main>
</body>
</html>`;
}

async function tryPdf() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.warn("Playwright not installed. Run: npm i -D playwright && npx playwright install chromium");
    return false;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(OUT_HTML).href, { waitUntil: "load" });
  await page.pdf({
    path: OUT_PDF,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", right: "12mm", bottom: "14mm", left: "12mm" },
  });
  await browser.close();
  console.log("PDF written:", OUT_PDF);
  return true;
}

function main() {
  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  const schemaSrc = read(path.join(ROOT, "src", "server", "db", "schema.ts"));
  const envExample = fs.existsSync(path.join(ROOT, ".env.example"))
    ? read(path.join(ROOT, ".env.example"))
    : "(.env.example not found)";
  const generatedAt = new Date().toISOString().slice(0, 19) + "Z";
  const sourceIndexRows = listSourceIndexRows(path.join(ROOT, "src"));
  const html = buildHtml({
    generatedAt,
    schemaBlocks: extractSchemaBlocks(schemaSrc),
    envExample,
    sourceIndexRows,
  });
  fs.writeFileSync(OUT_HTML, html, "utf8");
  console.log("HTML written:", OUT_HTML);
}

main();

if (process.argv.includes("--pdf")) {
  tryPdf().then((ok) => {
    if (!ok) process.exitCode = 1;
  });
}
