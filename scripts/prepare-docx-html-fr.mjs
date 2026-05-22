/**
 * Applique des styles inline au HTML du rapport pour une conversion DOCX soignée (html-to-docx).
 */

import * as cheerio from "cheerio";

const FONT = "Cambria, Georgia, serif";
const ACCENT = "#B54708";
const INK = "#1F2937";
const MUTED = "#6B7280";
const LINE = "#D1D5DB";

const CLASS_STYLES = {
  "cover-univ":
    `font-family: ${FONT}; font-size: 14pt; font-weight: 700; text-align: center; margin: 6pt 0; color: ${INK};`,
  "cover-faculty":
    `font-family: ${FONT}; font-size: 13pt; font-weight: 600; text-align: center; margin: 4pt 0; color: ${INK};`,
  "cover-framework":
    `font-family: ${FONT}; font-size: 12pt; font-style: italic; text-align: center; margin: 4pt 0; color: #374151;`,
  "cover-kicker":
    `font-family: ${FONT}; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.25em; text-align: center; color: ${MUTED}; margin: 0 0 8pt;`,
  "cover-title":
    `font-family: ${FONT}; font-size: 22pt; font-weight: 700; text-align: center; color: #111827; margin: 12pt 0; line-height: 1.25;`,
  "cover-subtitle":
    `font-family: ${FONT}; font-size: 12pt; font-style: italic; text-align: center; color: #374151; margin: 8pt auto; max-width: 90%; line-height: 1.4;`,
  "cover-theme":
    `font-family: ${FONT}; font-size: 10.5pt; text-align: center; color: ${MUTED}; margin: 6pt auto; max-width: 90%; line-height: 1.35;`,
  "cover-label":
    `font-family: ${FONT}; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.15em; color: ${MUTED}; margin: 0 0 4pt;`,
  "cover-name":
    `font-family: ${FONT}; font-size: 11pt; font-weight: 600; color: ${INK}; margin: 2pt 0;`,
  "cover-year":
    `font-family: ${FONT}; font-size: 12pt; font-weight: 700; text-align: center; letter-spacing: 0.1em; margin-top: 18pt; color: ${INK};`,
  "doc-title":
    `font-family: ${FONT}; font-size: 18pt; font-weight: 700; color: #111827; margin: 0 0 10pt;`,
  colophon:
    `font-family: ${FONT}; font-size: 9pt; color: ${MUTED}; margin-top: 24pt; padding-top: 8pt; border-top: 1pt solid #E5E7EB;`,
};

function mergeStyle($el, extra) {
  const prev = $el.attr("style") || "";
  const sep = prev && !prev.trim().endsWith(";") ? "; " : "";
  $el.attr("style", `${prev}${sep}${extra}`);
}

function applyClassStyles($) {
  for (const [cls, style] of Object.entries(CLASS_STYLES)) {
    $(`.${cls}`).each((_, el) => mergeStyle($(el), style));
  }
}

function styleCover($) {
  $("section.cover").attr(
    "style",
    `font-family: ${FONT}; text-align: center; padding: 36pt 48pt 28pt;`
  );
  $(".cover-header").attr("style", "margin-bottom: 24pt;");
  $(".cover-title-block").attr("style", "margin: 20pt 0;");
  $(".cover-people").attr(
    "style",
    "display: block; margin-top: 28pt; text-align: left; width: 100%;"
  );
  $(".cover-people-col").attr("style", "margin-bottom: 12pt;");
}

function styleHeadings($) {
  $("main.body h2").each((_, el) => {
    const $el = $(el);
    if ($el.hasClass("chapter-title")) {
      mergeStyle(
        $el,
        `font-family: ${FONT}; font-size: 13pt; font-weight: 700; color: ${ACCENT}; margin: 22pt 0 8pt; padding-bottom: 4pt; border-bottom: 1.5pt solid ${ACCENT};`
      );
      return;
    }
    mergeStyle(
      $el,
      `font-family: ${FONT}; font-size: 12pt; font-weight: 700; color: #0F172A; margin: 16pt 0 6pt; padding-bottom: 3pt; border-bottom: 1pt solid ${LINE};`
    );
  });

  $("h1.doc-title").each((_, el) => {
    mergeStyle(
      $(el),
      `font-family: ${FONT}; font-size: 18pt; font-weight: 700; color: #111827; margin: 0 0 10pt; text-align: center;`
    );
  });

  $("h3").each((_, el) => {
    const $el = $(el);
    if ($el.hasClass("chapter-title")) return;
    mergeStyle(
      $el,
      `font-family: ${FONT}; font-size: 11pt; font-weight: 700; color: #0F172A; margin: 14pt 0 6pt;`
    );
  });

  $("h4").each((_, el) => {
    mergeStyle(
      $(el),
      `font-family: ${FONT}; font-size: 10.5pt; font-weight: 700; color: ${INK}; margin: 10pt 0 4pt;`
    );
  });
}

function styleBodyText($) {
  $("main.body p").each((_, el) => {
    const $el = $(el);
    if ($el.hasClass("colophon") || $el.parents("section.cover").length) return;
    mergeStyle(
      $el,
      `font-family: ${FONT}; font-size: 10pt; line-height: 1.35; text-align: justify; margin: 4pt 0; color: ${INK};`
    );
  });

  $("main.body li").each((_, el) => {
    mergeStyle(
      $(el),
      `font-family: ${FONT}; font-size: 10pt; line-height: 1.35; color: ${INK}; margin: 2pt 0;`
    );
  });

  $("main.body ul, main.body ol").each((_, el) => {
    mergeStyle($(el), `font-family: ${FONT}; margin: 6pt 0 10pt 18pt; padding-left: 12pt;`);
  });
}

function styleLabels($) {
  const labelStyle = `color: ${ACCENT}; font-weight: 700;`;
  $("strong").each((_, el) => {
    const text = $(el).text().trim();
    if (/^(Rôle|Éléments principaux|Impact)\./.test(text)) {
      mergeStyle($(el), labelStyle);
    }
  });
}

function styleTables($) {
  $("table.data").each((_, el) => {
    mergeStyle(
      $(el),
      `width: 100%; border-collapse: collapse; font-family: ${FONT}; font-size: 9.5pt; margin: 8pt 0 12pt;`
    );
  });
  $("table.data th").each((_, el) => {
    mergeStyle(
      $(el),
      `background-color: #F3F4F6; font-weight: 700; color: #111827; border: 1pt solid ${LINE}; padding: 5pt 6pt; text-align: left; vertical-align: top;`
    );
  });
  $("table.data td").each((_, el) => {
    mergeStyle(
      $(el),
      `border: 1pt solid ${LINE}; padding: 5pt 6pt; vertical-align: top; color: ${INK};`
    );
  });
}

function styleMediaSpacers($) {
  $(".media-spacer.is-diagram").each((_, el) => {
    mergeStyle(
      $(el),
      "min-height: 200pt; height: 200pt; background-color: #FAFAFA; margin: 10pt 0;"
    );
  });
  $(".media-spacer.is-capture").each((_, el) => {
    mergeStyle(
      $(el),
      "min-height: 260pt; height: 260pt; background-color: #F9FAFB; margin: 12pt 0; border: 0.5pt solid #E5E7EB;"
    );
  });
}

function insertPageBreakAfterCover($) {
  const $cover = $("section.cover").first();
  if (!$cover.length) return;
  if ($cover.next(".page-break").length) return;
  $cover.after(
    '<div class="page-break" style="page-break-after: always;"></div>'
  );
}

/**
 * @param {string} fragment HTML (couverture + corps)
 * @returns {string}
 */
export function prepareDocxHtml(fragment) {
  const $ = cheerio.load(`<div id="docx-root">${fragment}</div>`, {
    decodeEntities: false,
    xml: false,
  });

  applyClassStyles($);
  styleCover($);
  styleHeadings($);
  styleBodyText($);
  styleLabels($);
  styleTables($);
  styleMediaSpacers($);
  insertPageBreakAfterCover($);

  return $("#docx-root").html() || fragment;
}

export function buildDocxFooterHtml() {
  return `<p style="font-family: ${FONT}; font-size: 9pt; color: ${MUTED}; text-align: center; margin: 0;">
    Seller Helper — Documentation fonctionnelle · Vitrina Store
  </p>`;
}

export function buildDocxHeaderHtml(meta = {}) {
  const title = meta.title || "Seller Helper";
  return `<p style="font-family: ${FONT}; font-size: 9pt; color: ${MUTED}; text-align: right; margin: 0;">
    ${title}
  </p>`;
}
