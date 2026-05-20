import { normalizeRoleKey } from "@/lib/recommendation-roles";

export type RecommendationRoleDefinition = {
  roleKey: string;
  displayName: string;
};

export type RecommendationTaskInput = {
  title: string;
  analysis: string;
  recommendation: string;
};

type RoleCategory = "technical" | "marketing" | "operations" | "general";

type SignalSet = {
  strong: string[];
  weak: string[];
  anti: string[];
};

const TECHNICAL_SIGNALS: SignalSet = {
  strong: [
    "chargily",
    "payment gateway",
    "paiement",
    "checkout error",
    "api",
    "webhook",
    "integration",
    "bug",
    "erreur",
    "error",
    "javascript",
    "js error",
    "crash",
    "500",
    "404",
    "database",
    "neon",
    "serveur",
    "server",
    "ssl",
    "dns",
    "performance",
    "lcp",
    "latency",
    "timeout",
    "chargement",
    "technical",
    "technique",
    "infrastructure",
    "deploy",
    "vercel",
    "authentication",
    "session",
    "oauth",
    "better auth",
    "micro-event",
    "tracking script",
    "console",
    "stack trace",
  ],
  weak: ["checkout", "panier technique", "fix", "repair", "patch", "monitoring"],
  anti: [
    "seo",
    "merchandising",
    "conversion rate",
    "campaign",
    "promotion",
    "brand",
    "marque",
    "prix psychologique",
    "product title",
    "titre produit",
    "vitrina",
    "catalogue marketing",
  ],
};

const MARKETING_SIGNALS: SignalSet = {
  strong: [
    "conversion",
    "funnel",
    "merchandising",
    "vitrina",
    "seo",
    "campaign",
    "campagne",
    "promotion",
    "promo",
    "pricing",
    "prix",
    "psychological pricing",
    "catalogue",
    "catalog",
    "product page",
    "fiche produit",
    "title",
    "titre",
    "description produit",
    "image produit",
    "photo",
    "avis",
    "review",
    "brand",
    "marque",
    "marketing",
    "abandon de panier",
    "cart abandon",
    "panier abandonné",
    "cta",
    "call to action",
    "upsell",
    "cross-sell",
    "stock presentation",
    "best seller",
    "hero",
    "banner",
  ],
  weak: ["panier", "cart", "traffic", "trafic", "engagement", "click", "clic"],
  anti: [
    "api error",
    "bug",
    "chargily",
    "database",
    "javascript error",
    "500 error",
    "payment api",
    "webhook failure",
    "lcp",
    "server crash",
  ],
};

const OPERATIONS_SIGNALS: SignalSet = {
  strong: [
    "inventory",
    "stock",
    "rupture",
    "out of stock",
    "réapprovisionnement",
    "warehouse",
    "entrepôt",
    "shipping",
    "livraison",
    "fulfillment",
    "logistics",
    "logistique",
    "supply",
    "supplier",
    "fournisseur",
    "order fulfillment",
  ],
  weak: ["quantity", "sku", "catalog sync"],
  anti: ["seo campaign", "javascript", "api key"],
};

const BUILTIN_BY_KEY: Record<string, SignalSet> = {
  marketing_agent: MARKETING_SIGNALS,
  technical_support: TECHNICAL_SIGNALS,
};

function inferCategory(roleKey: string, displayName: string): RoleCategory {
  const id = `${roleKey} ${displayName}`.toLowerCase();
  if (
    /\b(tech|support|dev|engineer|developer|api|infra|sre|backend|frontend|it|helpdesk|help desk)\b/.test(
      id
    )
  ) {
    return "technical";
  }
  if (
    /\b(market|merch|growth|seo|brand|sales|campaign|campagne|content|copy|communication|cm)\b/.test(
      id
    )
  ) {
    return "marketing";
  }
  if (
    /\b(inventory|stock|warehouse|logistic|logistique|shipping|livraison|ops|operation|fulfil)/.test(
      id
    )
  ) {
    return "operations";
  }
  return "general";
}

function signalsForCategory(category: RoleCategory): SignalSet {
  if (category === "technical") return TECHNICAL_SIGNALS;
  if (category === "marketing") return MARKETING_SIGNALS;
  if (category === "operations") return OPERATIONS_SIGNALS;
  return {
    strong: [],
    weak: ["recommendation", "améliorer", "optimiser"],
    anti: [],
  };
}

function signalsForRole(role: RecommendationRoleDefinition): SignalSet {
  const key = normalizeRoleKey(role.roleKey);
  if (BUILTIN_BY_KEY[key]) return BUILTIN_BY_KEY[key];
  return signalsForCategory(inferCategory(key, role.displayName));
}

function countSignalHits(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const phrase of phrases) {
    if (lower.includes(phrase.toLowerCase())) hits += 1;
  }
  return hits;
}

export function scoreRoleForTask(text: string, role: RecommendationRoleDefinition): number {
  const signals = signalsForRole(role);
  const strong = countSignalHits(text, signals.strong);
  const weak = countSignalHits(text, signals.weak);
  const anti = countSignalHits(text, signals.anti);
  return strong * 4 + weak * 1 - anti * 5;
}

/** Human-readable scope for LLM prompts (works for custom roles too). */
export function describeRoleScopeForLlm(role: RecommendationRoleDefinition): string {
  const key = normalizeRoleKey(role.roleKey);
  if (key === "marketing_agent") {
    return "Merchandising, conversion, pricing, SEO, product presentation, campaigns, catalogue, funnel, reviews.";
  }
  if (key === "technical_support") {
    return "Bugs, APIs, payments (Chargily), checkout errors, performance, database, integrations, security, infrastructure.";
  }
  const category = inferCategory(key, role.displayName);
  if (category === "technical") {
    return "Technical fixes, integrations, errors, performance, checkout/payment systems.";
  }
  if (category === "marketing") {
    return "Marketing, conversion, merchandising, pricing, content, and growth tasks.";
  }
  if (category === "operations") {
    return "Inventory, stock, logistics, shipping, and fulfilment tasks.";
  }
  return `Tasks aligned with “${role.displayName}” responsibilities.`;
}

export function buildRoleAssignmentPromptBlock(roles: RecommendationRoleDefinition[]): string {
  if (roles.length === 0) {
    return "No roles configured — use assignedRoleKey marketing_agent.";
  }
  const lines = roles.map(
    (r) => `- ${r.roleKey} (${r.displayName}): ${describeRoleScopeForLlm(r)}`
  );
  return [
    "Assign each recommendation to exactly ONE assignedRoleKey from the list below.",
    "Match the concrete task (title + analysis + recommendation) to the role scope — never assign technical fixes to marketing-only roles or merchandising tasks to technical_support.",
    "Roles:",
    ...lines,
  ].join("\n");
}

/**
 * Picks the best role using keyword scoring + optional LLM preference as a small bonus.
 */
export function pickAssignedRoleKey(
  input: RecommendationTaskInput,
  roles: RecommendationRoleDefinition[],
  llmPreferredKey?: string | null
): string {
  if (roles.length === 0) return "marketing_agent";

  const text = `${input.title} ${input.analysis} ${input.recommendation}`;
  const normalizedRoles = roles.map((r) => ({
    roleKey: normalizeRoleKey(r.roleKey),
    displayName: r.displayName.trim() || r.roleKey.replace(/_/g, " "),
  }));

  let bestKey = normalizedRoles[0].roleKey;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const role of normalizedRoles) {
    let score = scoreRoleForTask(text, role);
    const preferred = llmPreferredKey ? normalizeRoleKey(llmPreferredKey) : "";
    if (preferred && preferred === role.roleKey) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestKey = role.roleKey;
    }
  }

  if (bestScore < 1) {
    const categoryScores = normalizedRoles.map((role) => ({
      role,
      category: inferCategory(role.roleKey, role.displayName),
    }));
    const textCategory = inferCategoryFromTaskText(text);
    const match = categoryScores.find((r) => r.category === textCategory);
    if (match) return match.role.roleKey;
  }

  return bestKey;
}

function inferCategoryFromTaskText(text: string): RoleCategory {
  const tech = scoreRoleForTask(text, { roleKey: "technical_support", displayName: "Technical" });
  const mkt = scoreRoleForTask(text, { roleKey: "marketing_agent", displayName: "Marketing" });
  const ops = scoreRoleForTask(text, { roleKey: "operations", displayName: "Operations" });
  if (tech >= mkt && tech >= ops && tech > 0) return "technical";
  if (mkt >= ops && mkt > 0) return "marketing";
  if (ops > 0) return "operations";
  return "general";
}
