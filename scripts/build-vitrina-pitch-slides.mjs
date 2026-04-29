import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_HTML = path.join(ROOT, "reports", "Vitrina-Store-Pitch-Deck-Slides-v2.html");
const OUT_PDF = path.join(ROOT, "reports", "Vitrina-Store-Pitch-Deck-Slides-v2.pdf");

function html() {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vitrina Store — Pitch Deck</title>
  <style>
    :root{
      --bg:#0f172a;
      --panel:#111827;
      --text:#f8fafc;
      --muted:#cbd5e1;
      --accent:#fb923c;
      --line:rgba(148,163,184,.35);
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      font-family: Inter, Segoe UI, Arial, sans-serif;
      background:#0b1220;
      color:var(--text);
    }
    .slide{
      width:1600px;
      height:900px;
      margin:0 auto;
      padding:64px 80px;
      background:var(--bg);
      border-bottom:1px solid #000;
      display:flex;
      flex-direction:column;
      justify-content:flex-start;
      page-break-after:always;
    }
    .kicker{
      color:var(--accent);
      text-transform:uppercase;
      letter-spacing:.14em;
      font-weight:700;
      font-size:14px;
      margin-bottom:14px;
    }
    h1{
      margin:0 0 14px;
      font-size:60px;
      line-height:1.08;
      max-width:1100px;
    }
    h2{
      margin:0 0 22px;
      font-size:44px;
      line-height:1.1;
    }
    p{
      margin:0;
      color:var(--muted);
      font-size:28px;
      line-height:1.35;
      max-width:1200px;
    }
    .small{font-size:20px}
    .grid-3{
      margin-top:28px;
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:16px;
    }
    .grid-2{
      margin-top:24px;
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:18px;
    }
    .card{
      border:1px solid var(--line);
      border-radius:14px;
      padding:20px 22px;
      background:var(--panel);
      min-height:160px;
    }
    .card h3{
      margin:0 0 10px;
      font-size:26px;
      color:#fff;
    }
    .card p{font-size:22px}
    ul{
      margin:6px 0 0 28px;
      padding:0;
      color:var(--muted);
      font-size:26px;
      line-height:1.45;
    }
    li{margin:8px 0}
    table{
      width:100%;
      border-collapse:collapse;
      margin-top:18px;
      font-size:20px;
    }
    th,td{
      border:1px solid var(--line);
      padding:10px 12px;
      text-align:left;
      vertical-align:top;
    }
    th{color:#fff;background:#1f2937}
    .footer{
      margin-top:auto;
      font-size:18px;
      color:#94a3b8;
    }
    @media print{
      @page{size:1600px 900px;margin:0}
      body{background:#000}
    }
  </style>
</head>
<body>
  <section class="slide">
    <div class="kicker">Vitrina Seller Intelligence</div>
    <h1>AI assistant for sellers to fix dead products and boost conversions</h1>
    <p>For each product, Vitrina explains what shoppers engage with, what blocks sales, and what to change in title, image, and front-page placement.</p>
    <div class="grid-3">
      <div class="card"><h3>Main user</h3><p>Seller / store operator</p></div>
      <div class="card"><h3>Main output</h3><p>Actionable product recommendations</p></div>
      <div class="card"><h3>Main impact</h3><p>Higher product-level conversion rate</p></div>
    </div>
    <div class="footer">Generated ${now}</div>
  </section>

  <section class="slide">
    <div class="kicker">Core Problem</div>
    <h2>Sellers see traffic, but they do not know why specific products do not sell</h2>
    <ul>
      <li>They cannot tell which product specs buyers care about most.</li>
      <li>They cannot detect friction quickly (payment issues, trust issues, weak listing).</li>
      <li>They do not know what to promote in title, hero image, or homepage placements.</li>
    </ul>
  </section>

  <section class="slide">
    <div class="kicker">Product Vision</div>
    <h2>One seller page that turns engagement signals into concrete actions</h2>
    <div class="grid-2">
      <div class="card">
        <h3>Per-product insight</h3>
        <ul>
          <li>Most engaged specs or sections</li>
          <li>Most viewed variants (color/size/spec)</li>
          <li>Review-tab intensity and quality concern signals</li>
        </ul>
      </div>
      <div class="card">
        <h3>Per-product recommendations</h3>
        <ul>
          <li>What to move to title and first image</li>
          <li>What to place on homepage cards</li>
          <li>What issue to fix first (payment, trust, content, pricing)</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="slide">
    <div class="kicker">How It Works</div>
    <h2>Behavioral telemetry + diagnosis logic + assistant recommendations</h2>
    <table>
      <thead><tr><th>Layer</th><th>Data captured</th><th>Decision produced</th></tr></thead>
      <tbody>
        <tr><td>Engagement tracking</td><td>Clicks, product visits, tab focus, scroll depth, variant interactions</td><td>Top attention hotspots by product</td></tr>
        <tr><td>Friction detection</td><td>Checkout drop-offs, payment failures, repeat review checks, bounce patterns</td><td>Likely reason product is underperforming</td></tr>
        <tr><td>Seller assistant</td><td>Product context + engagement deltas + conversion gaps</td><td>Prioritized listing and merchandising actions</td></tr>
      </tbody>
    </table>
  </section>

  <section class="slide">
    <div class="kicker">Example Output</div>
    <h2>What a seller sees for a weak product</h2>
    <div class="grid-2">
      <div class="card">
        <h3>Detected signals</h3>
        <ul>
          <li>High review-tab opens before exit</li>
          <li>Most clicks on “battery life” spec</li>
          <li>Black color gets 2.3x more interactions</li>
        </ul>
      </div>
      <div class="card">
        <h3>Recommended actions</h3>
        <ul>
          <li>Move battery life to title and first image text</li>
          <li>Add quality proof near price and CTA</li>
          <li>Feature black variant on homepage placement</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="slide">
    <div class="kicker">Why This Wins</div>
    <h2>Not just analytics, but seller decisions at product granularity</h2>
    <ul>
      <li>Traditional dashboards show numbers; Vitrina explains why and what to do next.</li>
      <li>Recommendations are tied directly to listing assets sellers can edit fast.</li>
      <li>Feedback loop improves as more engagement data accumulates per product type.</li>
    </ul>
  </section>

  <section class="slide">
    <div class="kicker">Roadmap + Ask</div>
    <h2>Build the best AI copilot for regional sellers</h2>
    <div class="grid-3">
      <div class="card"><h3>Phase 1</h3><p>Reliable telemetry, seller page MVP, top-3 recommendations per product.</p></div>
      <div class="card"><h3>Phase 2</h3><p>Root-cause confidence scoring and automated A/B suggestion generation.</p></div>
      <div class="card"><h3>Phase 3</h3><p>Multi-store benchmark intelligence and self-optimizing merchandising.</p></div>
    </div>
    <p class="small" style="margin-top:20px;">Funding focus: product intelligence, model quality, and merchant adoption channels.</p>
  </section>
</body>
</html>`;
}

async function build() {
  fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
  fs.writeFileSync(OUT_HTML, html(), "utf8");
  console.log(`HTML written: ${OUT_HTML}`);

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright missing. Install with: npm i -D playwright && npx playwright install chromium");
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(pathToFileURL(OUT_HTML).href, { waitUntil: "networkidle" });
  await page.pdf({
    path: OUT_PDF,
    width: "1600px",
    height: "900px",
    printBackground: true,
    margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
  });
  await browser.close();
  console.log(`PDF written: ${OUT_PDF}`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
