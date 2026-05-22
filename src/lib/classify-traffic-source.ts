/** French display labels for Seller Helper traffic-source breakdown. */
export const TRAFFIC_SOURCE_LABEL = {
  direct: "Saisie directe",
  google: "Google",
  searchEngine: "Moteur de recherche",
  facebook: "Facebook",
  instagram: "Instagram",
  otherSocial: "Autre réseau social",
  internal: "Navigation interne",
  otherSite: "Autre site",
} as const;

export type TrafficSourceLabel = (typeof TRAFFIC_SOURCE_LABEL)[keyof typeof TRAFFIC_SOURCE_LABEL];

const SEARCH_ENGINE_HOSTS = new Set([
  "bing.com",
  "www.bing.com",
  "duckduckgo.com",
  "www.duckduckgo.com",
  "yahoo.com",
  "search.yahoo.com",
  "ecosia.org",
  "www.ecosia.org",
  "qwant.com",
  "www.qwant.com",
  "baidu.com",
  "www.baidu.com",
  "yandex.ru",
  "yandex.com",
  "search.brave.com",
  "ask.com",
  "www.ask.com",
]);

const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "fb.com",
  "www.fb.com",
  "l.facebook.com",
  "fb.me",
  "lm.facebook.com",
]);

const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "l.instagram.com",
  "lm.instagram.com",
]);

/** Always shown in Seller Helper « Sources de trafic » (even at 0 sessions). */
export const PINNED_TRAFFIC_SOURCE_LABELS: TrafficSourceLabel[] = [
  TRAFFIC_SOURCE_LABEL.facebook,
  TRAFFIC_SOURCE_LABEL.instagram,
];

const OTHER_SOCIAL_HOSTS = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com",
  "t.co",
  "linkedin.com",
  "www.linkedin.com",
  "pinterest.com",
  "www.pinterest.com",
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "snapchat.com",
  "www.snapchat.com",
  "reddit.com",
  "www.reddit.com",
]);

const INTERNAL_HOST_HINTS = ["localhost", "127.0.0.1", "vitrina-store"];

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^www\./, "");
}

function hostFromReferrer(referrer: string): string | null {
  const trimmed = referrer.trim();
  if (!trimmed) return null;
  try {
    return normalizeHost(new URL(trimmed).hostname);
  } catch {
    return null;
  }
}

function parseContextSource(raw: string | null | undefined): {
  host: string | null;
  utmSource: string | null;
} {
  if (!raw || typeof raw !== "string") return { host: null, utmSource: null };
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "direct") return { host: null, utmSource: null };

  const parts = trimmed.split("|");
  const hostPart = parts[0]?.trim() ?? "";
  let host: string | null = hostPart && hostPart !== "direct" ? normalizeHost(hostPart) : null;

  let utmSource: string | null = null;
  for (const part of parts.slice(1)) {
    const segment = part.trim();
    if (segment.startsWith("utm:")) {
      utmSource = segment.slice(4).trim().toLowerCase() || null;
      break;
    }
  }

  if (!host && utmSource) {
    host = normalizeHost(utmSource);
  }

  return { host, utmSource };
}

function isGoogleHost(host: string): boolean {
  const h = normalizeHost(host);
  return h === "google" || h.endsWith(".google.com") || h === "google.com";
}

function isSearchEngineHost(host: string): boolean {
  const h = normalizeHost(host);
  if (isGoogleHost(h)) return false;
  if (SEARCH_ENGINE_HOSTS.has(h) || SEARCH_ENGINE_HOSTS.has(`www.${h}`)) return true;
  return (
    h.includes("bing.") ||
    h.includes("yahoo.") ||
    h.includes("duckduckgo") ||
    h.endsWith(".search.yahoo.com")
  );
}

function matchesSocialUtm(utmSource: string | null | undefined): TrafficSourceLabel | null {
  if (!utmSource?.trim()) return null;
  const u = utmSource.trim().toLowerCase();
  if (u.includes("facebook") || u === "fb" || u === "meta") return TRAFFIC_SOURCE_LABEL.facebook;
  if (u.includes("instagram") || u === "ig") return TRAFFIC_SOURCE_LABEL.instagram;
  if (
    u.includes("tiktok") ||
    u.includes("twitter") ||
    u === "x" ||
    u.includes("linkedin") ||
    u.includes("pinterest") ||
    u.includes("youtube") ||
    u.includes("snapchat") ||
    u.includes("reddit")
  ) {
    return TRAFFIC_SOURCE_LABEL.otherSocial;
  }
  return null;
}

function isFacebookHost(host: string): boolean {
  const h = normalizeHost(host);
  if (FACEBOOK_HOSTS.has(h)) return true;
  return h.includes("facebook.") || h === "fb" || h.endsWith(".fb.com");
}

function isInstagramHost(host: string): boolean {
  const h = normalizeHost(host);
  if (INSTAGRAM_HOSTS.has(h)) return true;
  return h.includes("instagram.");
}

function classifyHost(host: string): TrafficSourceLabel {
  const h = normalizeHost(host);
  if (isGoogleHost(h)) return TRAFFIC_SOURCE_LABEL.google;
  if (isSearchEngineHost(h)) return TRAFFIC_SOURCE_LABEL.searchEngine;
  if (isFacebookHost(h)) return TRAFFIC_SOURCE_LABEL.facebook;
  if (isInstagramHost(h)) return TRAFFIC_SOURCE_LABEL.instagram;
  for (const social of Array.from(OTHER_SOCIAL_HOSTS)) {
    const base = normalizeHost(social);
    if (h === base || h.endsWith(`.${base}`)) return TRAFFIC_SOURCE_LABEL.otherSocial;
  }
  return TRAFFIC_SOURCE_LABEL.otherSite;
}

function isInternalHost(host: string): boolean {
  const h = normalizeHost(host);
  if (INTERNAL_HOST_HINTS.some((hint) => h === hint || h.includes(hint))) return true;
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (appUrl) {
      const appHost = normalizeHost(new URL(appUrl).hostname);
      if (appHost && (h === appHost || h.endsWith(`.${appHost}`))) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Classify a session's traffic source for Seller Helper (French labels).
 * Prefers the earliest non-null referrer; falls back to `pa_global_context.source`.
 */
function referrerImpliesSocial(referrer: string): TrafficSourceLabel | null {
  const lower = referrer.toLowerCase();
  if (
    lower.includes("facebook.com") ||
    lower.includes("fb.com") ||
    lower.includes("fb.me") ||
    lower.includes("messenger.com")
  ) {
    return TRAFFIC_SOURCE_LABEL.facebook;
  }
  if (lower.includes("instagram.com")) return TRAFFIC_SOURCE_LABEL.instagram;
  return null;
}

export function classifyTrafficSource(
  referrer: string | null | undefined,
  contextSource: string | null | undefined,
  utmSourceFromPayload?: string | null | undefined,
  socialClickIds?: { fbclid?: string | null; igshid?: string | null }
): TrafficSourceLabel {
  if (socialClickIds?.fbclid?.trim()) return TRAFFIC_SOURCE_LABEL.facebook;
  if (socialClickIds?.igshid?.trim()) return TRAFFIC_SOURCE_LABEL.instagram;

  if (referrer?.trim()) {
    const socialFromUrl = referrerImpliesSocial(referrer);
    if (socialFromUrl) return socialFromUrl;
    const refHost = hostFromReferrer(referrer);
    if (refHost) {
      if (isInternalHost(refHost)) return TRAFFIC_SOURCE_LABEL.internal;
      return classifyHost(refHost);
    }
  }

  const utmLabel =
    matchesSocialUtm(utmSourceFromPayload) ?? matchesSocialUtm(parseContextSource(contextSource).utmSource);
  if (utmLabel) return utmLabel;

  const { host } = parseContextSource(contextSource);
  if (host) {
    if (isInternalHost(host)) return TRAFFIC_SOURCE_LABEL.internal;
    return classifyHost(host);
  }

  return TRAFFIC_SOURCE_LABEL.direct;
}

export type TrafficSourceSlice = {
  label: string;
  sessions: number;
  ratePct: number;
};

/** Ensures Facebook and Instagram rows exist; pins them at the top of the list. */
export function mergePinnedTrafficSources(slices: TrafficSourceSlice[], totalSessions: number): TrafficSourceSlice[] {
  const byLabel = new Map(slices.map((s) => [s.label, { ...s }]));
  for (const label of PINNED_TRAFFIC_SOURCE_LABELS) {
    if (!byLabel.has(label)) {
      byLabel.set(label, { label, sessions: 0, ratePct: 0 });
    }
  }

  const pinned = PINNED_TRAFFIC_SOURCE_LABELS.map((label) => byLabel.get(label)!);
  const rest = Array.from(byLabel.values())
    .filter((s) => !PINNED_TRAFFIC_SOURCE_LABELS.includes(s.label as TrafficSourceLabel))
    .sort((a, b) => b.sessions - a.sessions);

  const merged = [...pinned, ...rest];
  if (totalSessions <= 0) return merged;

  return merged.map((s) => ({
    ...s,
    ratePct: (100 * s.sessions) / totalSessions,
  }));
}
