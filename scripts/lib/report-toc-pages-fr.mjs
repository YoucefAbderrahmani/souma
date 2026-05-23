/**
 * Estimation des numéros de page (partie numérotée à partir de PAGE_NUMBER_START)
 * et formatage de lignes de table des matières avec pointillés.
 */

/** Mots par page A4 (~Cambria 10 pt), calibré pour rapports denses. */
const WORDS_PER_PAGE = 420;

export function removeEmDashes(text) {
  return (text ?? "").replace(/\u2014/g, " - ");
}

export function formatTocLine(label, page) {
  const pageStr = String(page);
  const col = 62;
  const dotsLen = Math.max(4, col - label.length - pageStr.length - 1);
  return `${label} ${".".repeat(dotsLen)} ${pageStr}`;
}

/**
 * @param {string} md — markdown à partir de <!-- PAGE_NUMBER_START -->
 * @returns {Map<string, number>}
 */
export function estimateTocPageMap(md) {
  const start = md.indexOf("<!-- PAGE_NUMBER_START -->");
  if (start < 0) return new Map();

  const map = new Map();
  let page = 1;
  let wordsOnPage = 0;
  let inCode = false;

  for (const line of md.slice(start).split("\n")) {
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    if (/^<!--\s*PAGE_NUMBER_START/.test(trimmed)) {
      page = 1;
      wordsOnPage = 0;
      continue;
    }
    if (/^<!--\s*PAGE_BREAK/.test(trimmed)) {
      page += 1;
      wordsOnPage = 0;
      continue;
    }

    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    if (h2) map.set(h2[1].trim(), page);
    if (h3) map.set(h3[1].trim(), page);

    if (trimmed && !trimmed.startsWith("<!--")) {
      const wc = trimmed.split(/\s+/).filter(Boolean).length;
      wordsOnPage += wc;
      while (wordsOnPage >= WORDS_PER_PAGE) {
        page += 1;
        wordsOnPage -= WORDS_PER_PAGE;
      }
    }
  }

  return map;
}

export function pageFor(map, title) {
  if (map.has(title)) return map.get(title);
  const num = title.match(/^(\d+)\s/);
  if (num) {
    for (const [k, p] of map) {
      if (k.startsWith(`${num[1]} `)) return p;
    }
  }
  return 1;
}
