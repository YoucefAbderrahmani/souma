/** Client-side traffic attribution from referrer + URL params (Messenger, ads, UTM). */

export function inferDeviceFromUserAgent(ua: string): "mobile" | "tablet" | "desktop" {
  const l = ua.toLowerCase();
  if (l.includes("ipad") || (l.includes("android") && !l.includes("mobile"))) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

export function parseTrafficSource(): {
  source: string;
  utm: Record<string, string>;
  fbclid: string | null;
  igshid: string | null;
} {
  if (typeof window === "undefined") {
    return { source: "direct", utm: {}, fbclid: null, igshid: null };
  }
  let source = "direct";
  try {
    const r = document.referrer;
    if (r) source = new URL(r).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  const utm: Record<string, string> = {};
  const sp = new URLSearchParams(window.location.search);
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const v = sp.get(k);
    if (v) utm[k.replace("utm_", "")] = v.slice(0, 120);
  }
  const fbclid = sp.get("fbclid")?.trim().slice(0, 120) || null;
  const igshid = sp.get("igshid")?.trim().slice(0, 120) || null;
  if (utm.source) {
    source = `${source}|utm:${utm.source}`;
  } else if (fbclid) {
    source = source === "direct" ? "facebook|utm:facebook" : `${source}|utm:facebook`;
  } else if (igshid) {
    source = source === "direct" ? "instagram|utm:instagram" : `${source}|utm:instagram`;
  }
  return { source, utm, fbclid, igshid };
}
