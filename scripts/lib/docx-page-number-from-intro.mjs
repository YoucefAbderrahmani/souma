/**
 * Repositionne la numérotation Word : pages sans numéro (couverture + préliminaires),
 * puis numérotation à partir de 1 dès « Introduction générale ».
 */

import JSZip from "jszip";

const INTRO_TEXT = "Introduction générale";
/** Ancre invisible émise par build-seller-helper-graduation-report-fr.mjs (PAGE_NUMBER_START). */
const PAGE_ANCHOR_TEXT = "SH_PAGE_NUMBER_1";

const SECTION_BREAK = `<w:p><w:pPr><w:sectPr>
      <w:type w:val="nextPage"/>
      <w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:footerReference r:id="rId6" w:type="default"/>
      <w:pgNumType w:start="1"/>
    </w:sectPr></w:pPr></w:p>`;

function paragraphStartBefore(docXml, textIndex) {
  const pStart = docXml.lastIndexOf("<w:p>", textIndex);
  if (pStart < 0) {
    throw new Error("Paragraphe introuvable dans le DOCX");
  }
  return pStart;
}

function findAllTextIndices(docXml, text) {
  const indices = [];
  let from = 0;
  while (from < docXml.length) {
    const i = docXml.indexOf(text, from);
    if (i < 0) break;
    indices.push(i);
    from = i + text.length;
  }
  return indices;
}

function findIntroductionParagraphIndex(docXml) {
  const anchorIdx = docXml.indexOf(PAGE_ANCHOR_TEXT);
  if (anchorIdx >= 0) {
    const afterAnchor = docXml.indexOf(INTRO_TEXT, anchorIdx);
    if (afterAnchor >= 0) {
      return paragraphStartBefore(docXml, afterAnchor);
    }
  }

  const needles = [
    `<w:t xml:space="preserve">${INTRO_TEXT}</w:t>`,
    `<w:t>${INTRO_TEXT}</w:t>`,
  ];

  const paragraphStarts = new Set();
  for (const needle of needles) {
    let from = 0;
    while (from < docXml.length) {
      const introIdx = docXml.indexOf(needle, from);
      if (introIdx < 0) break;
      paragraphStarts.add(paragraphStartBefore(docXml, introIdx));
      from = introIdx + needle.length;
    }
  }

  if (paragraphStarts.size === 0) {
    throw new Error(`« ${INTRO_TEXT} » introuvable dans word/document.xml`);
  }

  // La table des matières cite aussi « Introduction générale » : prendre la dernière occurrence (= titre H2).
  return Math.max(...paragraphStarts);
}

function stripNumberingFromOpeningSection(docXml) {
  return docXml.replace(
    /<w:body>\s*<w:sectPr>([\s\S]*?)<\/w:sectPr>/,
    (_, inner) => {
      const cleaned = inner
        .replace(/<w:footerReference[^>]*\/>/g, "")
        .replace(/<w:titlePg\/>/g, "");
      return `<w:body><w:sectPr>${cleaned}</w:sectPr>`;
    }
  );
}

/**
 * @param {Buffer} docxBuffer
 * @returns {Promise<Buffer>}
 */
export async function restartDocxPageNumbersAtIntroduction(docxBuffer) {
  const zip = await JSZip.loadAsync(docxBuffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("word/document.xml manquant dans le DOCX");
  }

  let docXml = await docFile.async("string");
  docXml = stripNumberingFromOpeningSection(docXml);

  const pStart = findIntroductionParagraphIndex(docXml);
  docXml = docXml.slice(0, pStart) + SECTION_BREAK + docXml.slice(pStart);

  zip.file("word/document.xml", docXml);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
