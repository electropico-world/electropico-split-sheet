import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { MASTER_OWNERSHIP_LABEL_RELEASE_TEXT } from "./agreementText";
import { masterOwnerSignatureSource } from "./signing";
import type { AgreementBundle } from "./types";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 46;
const INK = rgb(0.08, 0.08, 0.08);
const MUTED = rgb(0.35, 0.35, 0.33);
const LINE = rgb(0.78, 0.78, 0.74);
const ACCENT = rgb(0.95, 0.84, 0);

function clean(value: string | null | undefined) {
  return value?.trim() || "—";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(page: PDFPage, text: string, x: number, y: number, maxWidth: number, font: PDFFont, size: number, lineHeight: number, color = INK) {
  const lines = wrapText(text, font, size, maxWidth);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
}

function drawHeader(page: PDFPage, bold: PDFFont, regular: PDFFont, pageNumber: number) {
  page.drawRectangle({ x: 0, y: PAGE_H - 17, width: PAGE_W, height: 17, color: ACCENT });
  page.drawText("ELECTROPICO", { x: MARGIN, y: PAGE_H - 47, size: 15, font: bold, color: INK });
  page.drawText("SPLIT SHEET", { x: MARGIN + 111, y: PAGE_H - 47, size: 9, font: regular, color: MUTED });
  page.drawText(String(pageNumber), { x: PAGE_W - MARGIN - 6, y: 25, size: 8, font: regular, color: MUTED });
}

function ensureSpace(pdf: PDFDocument, page: PDFPage, y: number, needed: number, bold: PDFFont, regular: PDFFont, pageNumber: number) {
  if (y - needed > 45) return { page, y, pageNumber };
  const next = pdf.addPage([PAGE_W, PAGE_H]);
  const nextPageNumber = pageNumber + 1;
  drawHeader(next, bold, regular, nextPageNumber);
  return { page: next, y: PAGE_H - 75, pageNumber: nextPageNumber };
}

function drawKeyValue(page: PDFPage, label: string, value: string, x: number, y: number, width: number, bold: PDFFont, regular: PDFFont) {
  page.drawText(label.toUpperCase(), { x, y, size: 7, font: bold, color: MUTED });
  page.drawText(value, { x, y: y - 15, size: 10.5, font: regular, color: INK, maxWidth: width });
  page.drawLine({ start: { x, y: y - 21 }, end: { x: x + width, y: y - 21 }, thickness: 0.7, color: LINE });
}

function drawTableRow(page: PDFPage, values: string[], widths: number[], x: number, y: number, height: number, font: PDFFont, size: number, fill?: ReturnType<typeof rgb>) {
  if (fill) page.drawRectangle({ x, y: y - height, width: widths.reduce((a, b) => a + b, 0), height, color: fill });
  let cursor = x;
  values.forEach((value, index) => {
    page.drawRectangle({ x: cursor, y: y - height, width: widths[index], height, borderColor: LINE, borderWidth: 0.5 });
    const lines = wrapText(value, font, size, widths[index] - 8).slice(0, 3);
    lines.forEach((line, lineIndex) => page.drawText(line, { x: cursor + 4, y: y - 13 - lineIndex * 10, size, font, color: INK }));
    cursor += widths[index];
  });
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1];
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

async function drawSignatureBlock(
  pdf: PDFDocument,
  page: PDFPage,
  y: number,
  pageNumber: number,
  bold: PDFFont,
  regular: PDFFont,
  serif: PDFFont,
  roleLabel: string,
  name: string,
  email: string,
  address: string,
  signatureData: string | null,
  signedName: string | null,
  signedAt: string | null,
  note?: string,
) {
  ({ page, y, pageNumber } = ensureSpace(pdf, page, y, 150, bold, regular, pageNumber));
  page.drawRectangle({ x: MARGIN, y: y - 128, width: PAGE_W - MARGIN * 2, height: 128, borderColor: LINE, borderWidth: 0.8 });
  page.drawText(roleLabel.toUpperCase(), { x: MARGIN + 12, y: y - 18, size: 7, font: bold, color: MUTED });
  page.drawText(name, { x: MARGIN + 12, y: y - 34, size: 11, font: bold, color: INK });
  page.drawText(clean(email), { x: MARGIN + 12, y: y - 52, size: 8.5, font: regular, color: INK });
  const addressLines = wrapText(clean(address), regular, 8.2, 220).slice(0, 3);
  addressLines.forEach((line, i) => page.drawText(line, { x: MARGIN + 12, y: y - 69 - i * 10, size: 8.2, font: regular, color: INK }));
  if (note) {
    const noteLines = wrapText(note, regular, 7.2, 248).slice(0, 3);
    noteLines.forEach((line, i) => page.drawText(line, { x: MARGIN + 12, y: y - 104 - i * 8.8, size: 7.2, font: regular, color: MUTED }));
  }
  page.drawText("SIGNATURE", { x: MARGIN + 284, y: y - 21, size: 7, font: bold, color: MUTED });
  if (signatureData) {
    try {
      const image = await pdf.embedPng(dataUrlToBytes(signatureData));
      const scale = Math.min(170 / image.width, 53 / image.height);
      page.drawImage(image, { x: MARGIN + 284, y: y - 82, width: image.width * scale, height: image.height * scale });
    } catch {
      page.drawText(signedName || name, { x: MARGIN + 284, y: y - 57, size: 16, font: serif, color: INK });
    }
  }
  page.drawLine({ start: { x: MARGIN + 284, y: y - 86 }, end: { x: PAGE_W - MARGIN - 12, y: y - 86 }, thickness: 0.7, color: LINE });
  page.drawText(`Signed: ${signedAt ? formatDate(signedAt) : "Pending"}`, { x: MARGIN + 284, y: y - 105, size: 8.3, font: regular, color: MUTED });
  return { page, y: y - 142, pageNumber };
}

export async function generateAgreementPdf(bundle: AgreementBundle) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let pageNumber = 1;
  drawHeader(page, bold, regular, pageNumber);
  let y = PAGE_H - 84;

  page.drawText("SONG & SOUND RECORDING", { x: MARGIN, y, size: 10, font: bold, color: MUTED });
  y -= 27;
  page.drawText("SPLIT AGREEMENT", { x: MARGIN, y, size: 28, font: bold, color: INK });
  y -= 42;

  const col = (PAGE_W - MARGIN * 2 - 18) / 2;
  drawKeyValue(page, "Effective Date", formatDate(bundle.effective_date), MARGIN, y, col, bold, regular);
  drawKeyValue(page, "Song Title", bundle.song_title, MARGIN + col + 18, y, col, bold, regular);
  y -= 54;
  drawKeyValue(page, "Release / Project", clean(bundle.release_name), MARGIN, y, col, bold, regular);
  drawKeyValue(page, "Primary Artist(s)", bundle.artist_name, MARGIN + col + 18, y, col, bold, regular);
  y -= 56;

  const intro = `Each undersigned songwriter, whether independently or jointly, has contributed to the authorship of the original musical composition identified above (the “Composition”) and, where applicable, to the associated sound recording (the “Master”). Ownership and administration of the Master shall be as stated in the Sound Recording Ownership table below. Rights in the Master include, without limitation, reproduction, manufacturing, monetization, distribution, promotion, and other commercial exploitation of the Master.`;
  y = drawWrapped(page, intro, MARGIN, y, PAGE_W - MARGIN * 2, serif, 9.4, 13.2, INK) - 10;

  const jointWork = `The undersigned intend that all music and lyrics in the Composition be merged into a single joint work. The Composition shall be registered with the applicable performing rights organizations and/or publishing administrators according to the shares below. Composition shares total 100%.`;
  y = drawWrapped(page, jointWork, MARGIN, y, PAGE_W - MARGIN * 2, serif, 9.4, 13.2, INK) - 10;

  y = drawWrapped(page, `Label Release. ${MASTER_OWNERSHIP_LABEL_RELEASE_TEXT}`, MARGIN, y, PAGE_W - MARGIN * 2, serif, 9.4, 13.2, INK) - 16;

  ({ page, y, pageNumber } = ensureSpace(pdf, page, y, 160, bold, regular, pageNumber));
  page.drawText("COMPOSITION OWNERSHIP", { x: MARGIN, y, size: 10, font: bold, color: INK });
  y -= 12;
  const writerWidths = [108, 38, 58, 52, 82, 182];
  drawTableRow(page, ["Songwriter", "%", "IPI / CAE", "PRO", "Publisher", "Contribution"], writerWidths, MARGIN, y, 25, bold, 7.1, rgb(0.95, 0.95, 0.92));
  y -= 25;
  for (const writer of bundle.songwriters) {
    drawTableRow(page, [writer.legal_name, `${writer.composition_percent}%`, clean(writer.ipi_cae), clean(writer.pro), clean(writer.publisher), writer.contribution], writerWidths, MARGIN, y, 36, regular, 7.3);
    y -= 36;
  }
  page.drawText("Composition Total: 100%", { x: PAGE_W - MARGIN - 121, y: y - 14, size: 9, font: bold, color: INK });
  y -= 35;

  ({ page, y, pageNumber } = ensureSpace(pdf, page, y, 120, bold, regular, pageNumber));
  page.drawText("SOUND RECORDING OWNERSHIP", { x: MARGIN, y, size: 10, font: bold, color: INK });
  y -= 12;
  const masterWidths = [296, 76, 148];
  drawTableRow(page, ["Sound Recording Owner / Copyright Claimant", "Ownership", "ISRC (if assigned)"], masterWidths, MARGIN, y, 25, bold, 7.1, rgb(0.95, 0.95, 0.92));
  y -= 25;
  for (const owner of bundle.master_owners) {
    drawTableRow(page, [owner.owner_name, `${owner.ownership_percent}%`, clean(owner.isrc)], masterWidths, MARGIN, y, 31, regular, 8);
    y -= 31;
  }
  page.drawText("Master Ownership Total: 100%", { x: PAGE_W - MARGIN - 146, y: y - 14, size: 9, font: bold, color: INK });
  y -= 36;

  ({ page, y, pageNumber } = ensureSpace(pdf, page, y, 170, bold, regular, pageNumber));
  const warranty = `Each undersigned warrants that they have disclosed all samples, interpolations, replays, or other third-party copyrighted material supplied by them. Unless otherwise agreed in writing, any clearance cost, claim, or reduction of rights attributable to undisclosed third-party material shall be borne by the party who supplied it, and no other contributor’s share shall be reduced solely because of material supplied by another contributor.`;
  y = drawWrapped(page, warranty, MARGIN, y, PAGE_W - MARGIN * 2, serif, 9.4, 13.2, INK) - 8;
  const law = `This Agreement may be signed in counterparts and electronically and shall be governed by the laws of the State/Commonwealth of ${bundle.governing_state}.`;
  y = drawWrapped(page, law, MARGIN, y, PAGE_W - MARGIN * 2, serif, 9.4, 13.2, INK) - 20;

  page.drawText("ACKNOWLEDGED AND AGREED — SONGWRITERS", { x: MARGIN, y, size: 12, font: serifBold, color: INK });
  y -= 25;
  for (const writer of bundle.songwriters) {
    ({ page, y, pageNumber } = await drawSignatureBlock(pdf, page, y, pageNumber, bold, regular, serif, "Songwriter", writer.legal_name, writer.email, writer.address, writer.signature_data, writer.signed_name, writer.signed_at, writer.professional_name ? `p/k/a ${writer.professional_name}` : undefined));
  }

  ({ page, y, pageNumber } = ensureSpace(pdf, page, y, 55, bold, regular, pageNumber));
  page.drawText("ACKNOWLEDGED AND AGREED — SOUND RECORDING OWNERS / COPYRIGHT CLAIMANTS", { x: MARGIN, y, size: 10.5, font: serifBold, color: INK });
  y -= 25;
  for (const owner of bundle.master_owners) {
    const source = masterOwnerSignatureSource(bundle, owner);
    ({ page, y, pageNumber } = await drawSignatureBlock(pdf, page, y, pageNumber, bold, regular, serif, "Sound Recording Owner / Copyright Claimant", owner.owner_name, source.email, source.address, source.signatureData, source.signedName, source.signedAt, `${owner.ownership_percent}% master ownership · ${source.note}`));
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
