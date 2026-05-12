export const DEMO_KPI = [
  { label: "Conversion Rate", value: "2.4%", delta: "+0.3%", deltaPositive: true },
  { label: "Unique Visitors", value: "12,847", delta: "+12.5%", deltaPositive: true },
  { label: "Abandoned Carts", value: "68%", delta: "-5.2%", deltaPositive: false },
  { label: "Page Views", value: "48,392", delta: "+8.1%", deltaPositive: true },
] as const;

export const DEMO_TOP_PAGES = [
  { page: "/products/smartphone-x", views: "8,234", conversions: "245", rate: "2.98%" },
  { page: "/products/laptop-pro", views: "6,891", conversions: "198", rate: "2.87%" },
  { page: "/products/headphones-wireless", views: "5,432", conversions: "156", rate: "2.87%" },
  { page: "/checkout", views: "4,123", conversions: "98", rate: "2.38%" },
  { page: "/products/camera-dslr", views: "3,876", conversions: "87", rate: "2.24%" },
] as const;

export const DEMO_DEVICES = [
  { name: "Mobile", pct: 58 },
  { name: "Desktop", pct: 32 },
  { name: "Tablet", pct: 10 },
] as const;

export const DEMO_TRAFFIC_SERIES = [
  0.15, 0.22, 0.18, 0.35, 0.55, 0.72, 0.68, 0.58, 0.62, 0.78, 0.85, 0.92, 0.88, 0.75, 0.7, 0.82, 0.9,
  0.95, 0.88, 0.72, 0.55, 0.42, 0.28, 0.2,
];

export const DEMO_FUNNEL_STEPS = [
  {
    title: "Product Page",
    countLabel: "1,000",
    fromPrevLabel: "100.0% from previous",
    overallLabel: "100.0%",
    abandonLabel: null as string | null,
    barPct: 100,
  },
  {
    title: "Add to Cart",
    countLabel: "320",
    fromPrevLabel: "32.0% from previous",
    overallLabel: "32.0%",
    abandonLabel: "68.0% abandonment",
    barPct: 32,
  },
  {
    title: "Checkout Started",
    countLabel: "85",
    fromPrevLabel: "26.6% from previous",
    overallLabel: "8.5%",
    abandonLabel: "73.4% abandonment",
    barPct: 8.5,
  },
  {
    title: "Order Completed",
    countLabel: "40",
    fromPrevLabel: "47.1% from previous",
    overallLabel: "4.0%",
    abandonLabel: "52.9% abandonment",
    barPct: 4,
  },
] as const;

export const DEMO_FUNNEL_SUMMARY = [
  {
    label: "Overall Conversion Rate",
    value: "4.0%",
    sub: "+0.3% vs last week",
    subTone: "emerald" as const,
  },
  {
    label: "Average Drop-off per Step",
    value: "64.7%",
    sub: "3 critical steps detected",
    subTone: "amber" as const,
  },
  {
    label: "Potential Revenue Lost",
    value: "48,250 DA",
    sub: "960 missed conversions",
    subTone: "rose" as const,
  },
] as const;

export const DEMO_FRICTION_ITEMS = [
  {
    priority: "HIGH PRIORITY",
    title: "Add to Cart → Checkout",
    body: "68% abandonment — main bottleneck identified",
    reco: "Reduce the number of checkout steps",
  },
  {
    priority: "MEDIUM PRIORITY",
    title: "Checkout → Completion",
    body: "53% abandonment — 70% of drop-offs come from mobile users",
    reco: "Optimize the form for mobile — enable autocomplete",
  },
] as const;

export const DEMO_USER_JOURNEYS = [
  {
    status: "ABANDONED" as const,
    users: "342 users",
    duration: "4m 23s",
    rate: "0%",
    path: "Homepage → Catalog → Product → Cart → Abandon",
  },
  {
    status: "CONVERTED" as const,
    users: "127 users",
    duration: "6m 12s",
    rate: "100%",
    path: "Homepage → Product → Cart → Checkout → Success",
  },
  {
    status: "ABANDONED" as const,
    users: "289 users",
    duration: "2m 08s",
    rate: "0%",
    path: "Search → Product → Abandon",
  },
  {
    status: "CONVERTED" as const,
    users: "93 users",
    duration: "8m 45s",
    rate: "100%",
    path: "Homepage → Catalog → Filters → Product → Cart → Success",
  },
] as const;

export const DEMO_HEATMAP_BANDS = [
  { label: "75-100%", tone: "from-blue-dark to-blue" },
  { label: "50-75%", tone: "from-blue to-blue-light" },
  { label: "25-50%", tone: "from-blue-light to-blue-light-3" },
  { label: "0-25%", tone: "from-blue-light-4 to-gray-2" },
] as const;

export const DEMO_SCROLL_CLICK_ITEMS = [
  { label: '"Add to cart" button', clicks: "8,234 clicks" },
  { label: "Product images", clicks: "6,891 clicks" },
  { label: "Size selection", clicks: "5,432 clicks" },
  { label: "Description tab", clicks: "3,876 clicks" },
  { label: "Customer reviews", clicks: "2,654 clicks" },
] as const;

export const DEMO_SESSION_REPLAYS = [{ id: "4236" }, { id: "4237" }, { id: "4238" }] as const;

export const DEMO_AI_SUMMARY = [
  { label: "Total Potential Revenue", value: "31,050 DA" },
  { label: "Active Recommendations", value: "5" },
  { label: "Average Impact", value: "+4.1%" },
] as const;

export const DEMO_AI_RECOMMENDATIONS = [
  {
    key: "rec-1",
    priority: "HIGH PRIORITY",
    tier: "high" as const,
    impact: "+8% conversion",
    title: "Optimize the mobile checkout form",
    confidence: 94,
    analyse:
      "70% of checkout page drop-offs come from mobile users. Analysis shows the address form has 12 fields, which is excessive on a small screen.",
    recommendation:
      "Enable autocomplete, reduce to 6 essential fields, and show a progress bar.",
    revenue: "12,400 DA",
    implementation: "2-3 days",
    roi: "12.4x",
  },
  {
    key: "rec-2",
    priority: "HIGH PRIORITY",
    tier: "high" as const,
    impact: "+5.2% conversion",
    title: "Add guest checkout",
    confidence: 89,
    analyse:
      "The drop-off rate between add to cart and checkout is 68%. Behavioral analysis shows 42% of users leave after seeing the required sign-up form.",
    recommendation:
      'Offer a "Checkout as guest" option to reduce friction. Collect only the information you need.',
    revenue: "8,750 DA",
    implementation: "3-4 days",
    roi: "12.4x",
  },
  {
    key: "rec-3",
    priority: "MEDIUM PRIORITY",
    tier: "medium" as const,
    impact: "+3.1% conversion",
    title: "Improve page load time",
    confidence: 82,
    analyse:
      "Average product page load time is 4.2 seconds. 23% of visitors leave before the page finishes loading.",
    recommendation:
      "Compress product images (WebP), implement lazy loading, and enable browser caching.",
    revenue: "4,200 DA",
    implementation: "1-2 days",
    roi: "12.4x",
  },
  {
    key: "rec-4",
    priority: "MEDIUM PRIORITY",
    tier: "medium" as const,
    impact: "+2.8% conversion",
    title: "Show shipping costs earlier",
    confidence: 76,
    analyse:
      "Scroll data shows only 34% of users scroll to shipping fees on the product page. Fees shown at checkout cause 18% of abandonments.",
    recommendation:
      'Show estimated shipping fees directly on the product page, near the "Add to cart" button.',
    revenue: "3,600 DA",
    implementation: "1 day",
    roi: "12.4x",
  },
  {
    key: "rec-5",
    priority: "LOW PRIORITY",
    tier: "low" as const,
    impact: "+1.5% conversion",
    title: "Improve search filters",
    confidence: 71,
    analyse:
      "Users who use filters convert 2.3x more often. Currently, only 28% of visitors interact with filters.",
    recommendation:
      "Make filters more visible, add popular quick filters, and show result counts in real time.",
    revenue: "2,100 DA",
    implementation: "2-3 days",
    roi: "12.4x",
  },
] as const;

export const DEMO_ALERTS_SUMMARY = [
  {
    label: "Active Alerts",
    value: "4",
    icon: "alert" as const,
    sub: { text: "2 critical", className: "font-medium text-red-dark" },
    tag: null,
  },
  {
    label: "Under Investigation",
    value: "2",
    icon: "clock" as const,
    sub: { text: "Average time: 45min", className: "text-dark-4" },
    tag: null,
  },
  {
    label: "Resolved (24h)",
    value: "12",
    icon: "check" as const,
    sub: { text: "-25% vs yesterday", className: "font-medium text-teal-dark" },
    tag: null,
  },
  {
    label: "Response Time",
    value: "8min",
    icon: "zap" as const,
    sub: null,
    tag: "Average",
  },
] as const;

export const DEMO_ALERT_INCIDENTS = [
  {
    key: "demo-0",
    severity: "CRITICAL",
    tier: "critical" as const,
    title: "Conversion drop",
    status: "ACTIVE",
    statusKind: "active" as const,
    description: "Conversion rate is 28% below the 7-day average",
    detail: "Detected at 2:23 PM. Current rate: 1.7% (average: 2.4%)",
    timeAgo: "12 minutes ago",
    affected: "847 users affected",
  },
  {
    key: "demo-1",
    severity: "HIGH",
    tier: "high" as const,
    title: "Technical error",
    status: "ACTIVE",
    statusKind: "active" as const,
    description: "JavaScript errors detected on the checkout page",
    detail: '8.3% of sessions hit the error "Cannot read property cartTotal"',
    timeAgo: "34 minutes ago",
    affected: "234 users affected",
  },
  {
    key: "demo-2",
    severity: "MEDIUM",
    tier: "medium" as const,
    title: "Mass cart abandonment",
    status: "UNDER INVESTIGATION",
    statusKind: "investigation" as const,
    description: "Cart abandonment rate > 85% over the last 2 hours",
    detail: "Unusual concentration of drop-offs among iOS users",
    timeAgo: "1 hour ago",
    affected: "456 users affected",
  },
  {
    key: "demo-3",
    severity: "LOW",
    tier: "low" as const,
    title: "Performance issue",
    status: "UNDER INVESTIGATION",
    statusKind: "investigation" as const,
    description: "Average catalog page load time > 4 seconds",
    detail: "Latency spikes detected between 1:00 PM and 3:00 PM",
    timeAgo: "2 hours ago",
    affected: "1,234 users affected",
  },
] as const;

export const DEMO_ALERTS_RESOLVED = [
  {
    title: "Sudden traffic spike (+350%) resolved",
    category: "Conversion drop",
    time: "3 hours ago",
    duration: "Duration: 45 minutes",
    detail: "Rate < average -20%",
  },
  {
    title: "Database connection error resolved",
    category: "JavaScript errors",
    time: "5 hours ago",
    duration: "Duration: 12 minutes",
    detail: "Errors > 5% of sessions",
  },
] as const;

export const DEMO_ALERT_RULES = [
  { name: "Abnormal traffic", condition: "Increase > 300% in 15min" },
  { name: "Load time", condition: "Average time > 4 seconds" },
  { name: "Cart abandonment", condition: "Rate > 80% over 2h" },
] as const;

export const DEMO_SECURITY_NOTES = [
  "No abnormal velocity spike detected in the last 15 minutes.",
  "Suspicious sessions remain below the alert threshold over the 7-day window.",
  "Checkout and cart micro-events keep a consistent signature.",
] as const;

export const DEMO_SECURITY_KPIS = [
  {
    label: "Bots détectés",
    value: "247",
    delta: "+12% vs hier",
    deltaPositive: false,
  },
  {
    label: "IPs bloquées",
    value: "89",
    delta: "+5% vs hier",
    deltaPositive: false,
  },
  {
    label: "Tentatives de fraude",
    value: "34",
    delta: "-8% vs hier",
    deltaPositive: true,
  },
  {
    label: "Score de sécurité",
    value: "94/100",
    delta: "+2 vs hier",
    deltaPositive: true,
  },
] as const;

export const DEMO_SECURITY_THREAT_ACTIVITY = {
  title: "Activité des menaces (24h)",
  description: "Évolution des tentatives d'intrusion",
  series: [8, 12, 10, 18, 24, 31, 28, 36, 42, 38, 45, 52, 48, 55, 50, 58, 54, 60, 52, 46, 40, 34, 28, 22],
} as const;

export const DEMO_SECURITY_THREAT_TYPES = {
  title: "Types de menaces",
  description: "Distribution (7 jours)",
  items: [
    { label: "Bot scraping", pct: 45 },
    { label: "Click fraud", pct: 28 },
    { label: "Fausses commandes", pct: 18 },
    { label: "Autres", pct: 9 },
  ],
} as const;

export const DEMO_SECURITY_INCIDENTS = [
  {
    id: "inc-1",
    status: "BLOQUÉ",
    statusTone: "risk" as const,
    category: "Bot scraping",
    riskScore: 97,
    title: "Visite de 847 pages produits en 4 minutes",
    detail: "Temps de séjour identique de 0,3 s par page, aucun mouvement de souris",
    ip: "192.168.1.45",
    location: "Inconnu",
    timeAgo: "Il y a 8 minutes",
  },
  {
    id: "inc-2",
    status: "SURVEILLANCE",
    statusTone: "attention" as const,
    category: "Click fraud",
    riskScore: 85,
    title: "Clics massifs sur publicités depuis IP suspecte",
    detail: "234 clics en 5 minutes, pattern répétitif détecté",
    ip: "203.0.113.78",
    location: "Vietnam",
    timeAgo: "Il y a 23 minutes",
  },
  {
    id: "inc-3",
    status: "SIGNALÉ",
    statusTone: "guidance" as const,
    category: "Fausse commande",
    riskScore: 78,
    title: "Commande avec email jetable et données invalides",
    detail: "Email temporaire, combinaison adresse/code postal invalide",
    ip: "198.51.100.42",
    location: "Russie",
    timeAgo: "Il y a 1 heure",
  },
  {
    id: "inc-4",
    status: "BLOQUÉ",
    statusTone: "risk" as const,
    category: "DDoS",
    riskScore: 92,
    title: "Rafale de requêtes sur la page d'accueil",
    detail: "45 123 requêtes en 2 heures depuis un petit pool d'adresses",
    ip: "192.0.2.123",
    location: "États-Unis",
    timeAgo: "Il y a 2 heures",
  },
  {
    id: "inc-5",
    status: "SURVEILLANCE",
    statusTone: "attention" as const,
    category: "Credential stuffing",
    riskScore: 81,
    title: "Tentatives de connexion répétées",
    detail: "67 essais sur 14 comptes en 12 minutes, rotation d'IP détectée",
    ip: "185.220.101.12",
    location: "Allemagne",
    timeAgo: "Il y a 3 heures",
  },
] as const;

export const DEMO_SECURITY_BLOCKED_IPS = [
  {
    id: "ip-1",
    ip: "192.168.1.45",
    reason: "Bot scraping",
    blockedRequests: 10234,
    blockedAgo: "Il y a 8 min",
  },
  {
    id: "ip-2",
    ip: "203.0.113.78",
    reason: "Click fraud",
    blockedRequests: 8456,
    blockedAgo: "Il y a 23 min",
  },
  {
    id: "ip-3",
    ip: "198.51.100.42",
    reason: "Spam",
    blockedRequests: 5678,
    blockedAgo: "Il y a 1 h",
  },
  {
    id: "ip-4",
    ip: "192.0.2.123",
    reason: "DDoS",
    blockedRequests: 45123,
    blockedAgo: "Il y a 2 h",
  },
  {
    id: "ip-5",
    ip: "185.220.101.12",
    reason: "Credential stuffing",
    blockedRequests: 3210,
    blockedAgo: "Il y a 3 h",
  },
] as const;
