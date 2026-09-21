import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { UPLOADS_ROOT } from '../../platform/uploads.js';
import type { DiscountTier, ScheduleRow } from './sales.service.js';
import type { InventoryUnitDocumentView } from '../inventory/index.js';
import type { IdentityAgentDocumentView } from '../identity/index.js';
import type { CrmContactView } from '../crm/index.js';
import type { SettingsCompanyView } from '../settings/index.js';

const NAVY = '#001F5B';
const GRAY = '#555555';

// pdfkit's built-in 14 standard fonts only cover Latin-1 (WinAnsi) — Khmer
// script needs its own embedded TTF or it silently renders as mojibake.
const KHMER_FONT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../assets/fonts/NotoSansKhmer-Regular.ttf',
);

export interface QuotationPdfData {
  number: string;
  createdAt: Date;
  validUntil: Date | null;
  listPrice: number;
  discounts: DiscountTier[];
  netPrice: number;
  schedule: ScheduleRow[];
  unit: InventoryUnitDocumentView | null;
  contact: CrmContactView | null;
  agent: IdentityAgentDocumentView | null;
  company: SettingsCompanyView | null;
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** `/uploads/<rel>` -> absolute disk path, or null if the file doesn't actually exist (best-effort — never crash the PDF over a missing asset). */
function resolveUploadPath(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/uploads/')) return null;
  const abs = path.join(UPLOADS_ROOT, url.slice('/uploads/'.length));
  return fs.existsSync(abs) ? abs : null;
}

function drawHeader(doc: PDFKit.PDFDocument, company: SettingsCompanyView | null, quotationNumber: string) {
  doc.fontSize(16).fillColor(NAVY).font('Helvetica-Bold').text(company?.name ?? 'ERA CAMBODIA', 40, 40);
  doc
    .fontSize(9)
    .fillColor(GRAY)
    .font('Helvetica')
    .text('Smart Property Intelligence', 40, 60);

  doc
    .fontSize(11)
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .text('QUOTATION TO PURCHASE', 300, 40, { width: 255, align: 'right' });
  doc
    .fontSize(9)
    .fillColor(GRAY)
    .font('Helvetica')
    .text(`No. ${quotationNumber}`, 300, 58, { width: 255, align: 'right' });

  doc.moveTo(40, 85).lineTo(555, 85).strokeColor('#DDDDDD').stroke();
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string, y: number) {
  doc.fontSize(11).fillColor(NAVY).font('Helvetica-Bold').text(title, 40, y);
  doc.moveTo(40, y + 16).lineTo(555, y + 16).strokeColor('#DDDDDD').stroke();
  return y + 26;
}

const KHMER_SCRIPT_RANGE = /[ក-៿]/;

function labelValueRow(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string) {
  doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(label, x, y, { width: 120 });
  doc
    .fontSize(10)
    .fillColor('#111111')
    .font(KHMER_SCRIPT_RANGE.test(value) ? 'Khmer' : 'Helvetica-Bold')
    .text(value, x + 120, y, { width: 130 });
}

export function renderQuotationPdf(data: QuotationPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.registerFont('Khmer', KHMER_FONT_PATH);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, data.company, data.number);

    let y = 100;
    y = sectionTitle(doc, 'PROPERTY DETAILS', y);
    labelValueRow(doc, 40, y, 'Project', data.unit?.project.name ?? '—');
    labelValueRow(doc, 300, y, 'Unit', data.unit?.code ?? '—');
    y += 20;
    labelValueRow(doc, 40, y, 'Type', data.unit?.unitType?.name ?? '—');
    labelValueRow(doc, 300, y, 'Gross Area', data.unit?.areaSqm != null ? `${data.unit.areaSqm} sqm` : '—');
    y += 20;
    labelValueRow(doc, 40, y, 'Net Area', data.unit?.netAreaSqm != null ? `${data.unit.netAreaSqm} sqm` : '—');
    labelValueRow(
      doc,
      300,
      y,
      'Bed / Bath',
      data.unit?.unitType ? `${data.unit.unitType.bedrooms} / ${data.unit.unitType.bathrooms}` : '—',
    );
    y += 32;

    y = sectionTitle(doc, 'PRICING AND DISCOUNT', y);
    labelValueRow(doc, 40, y, 'Original Price', money(data.listPrice));
    y += 20;
    let running = data.listPrice;
    data.discounts.forEach((d, i) => {
      const amount = Math.round((running * d.pct) / 100);
      running -= amount;
      labelValueRow(doc, 40, y, d.label || `Discount ${i + 1} (${d.pct}%)`, `- ${money(amount)}`);
      y += 20;
    });
    labelValueRow(doc, 40, y, 'Final Price', money(data.netPrice));
    y += 32;

    y = sectionTitle(doc, 'CUSTOMER & AGENT', y);
    labelValueRow(doc, 40, y, 'Customer', data.contact?.name ?? '—');
    labelValueRow(doc, 300, y, 'Agent', data.agent?.name ?? '—');
    y += 20;
    labelValueRow(doc, 40, y, 'Contact', data.contact?.phone ?? data.contact?.email ?? '—');
    labelValueRow(doc, 300, y, 'Name in Khmer', data.agent?.nameKhmer ?? '—');
    y += 20;
    labelValueRow(doc, 300, y, 'ERA Registration', data.agent?.licenseNumber ?? '—');
    y += 20;
    labelValueRow(doc, 300, y, 'Agent Contact', data.agent?.phone ?? data.agent?.email ?? '—');
    y += 20;
    if (data.validUntil) {
      labelValueRow(doc, 40, y, 'Valid Until', data.validUntil.toISOString().slice(0, 10));
      y += 20;
    }

    const agentPhoto = resolveUploadPath(data.agent?.photoUrl);
    if (agentPhoto) {
      try {
        doc.image(agentPhoto, 480, 175, { width: 60, height: 60, fit: [60, 60] });
      } catch {
        // best-effort — a corrupt/unreadable image never blocks the document
      }
    }

    y += 12;
    y = sectionTitle(doc, 'PAYMENT SCHEDULE', y);
    const cols = [40, 70, 220, 340, 450];
    doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY);
    doc.text('No.', cols[0], y, { width: 30 });
    doc.text('Milestone', cols[1], y, { width: 150 });
    doc.text('Date', cols[2], y, { width: 120 });
    doc.text('Net Amount', cols[3], y, { width: 110, align: 'right' });
    doc.text('Cumulative', cols[4], y, { width: 105, align: 'right' });
    y += 16;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#DDDDDD').stroke();
    y += 6;

    doc.font('Helvetica').fillColor('#111111');
    data.schedule.forEach((row, i) => {
      if (y > 760) {
        doc.addPage();
        y = 50;
      }
      doc.fontSize(9);
      doc.text(String(i + 1), cols[0], y, { width: 30 });
      doc.text(row.milestone ?? row.label, cols[1], y, { width: 150 });
      doc.text(row.date ? row.date.toISOString().slice(0, 10) : '—', cols[2], y, { width: 120 });
      doc.text(money(row.netAmount), cols[3], y, { width: 110, align: 'right' });
      doc.text(money(row.cumulativeAmount), cols[4], y, { width: 105, align: 'right' });
      y += 18;
    });

    // Project hero image + floor plan + site plan, one per page, matching the reference layout.
    const heroImage = resolveUploadPath(data.unit?.project.imageUrls[0]);
    const floorPlan = resolveUploadPath(data.unit?.unitType?.floorPlanUrl);
    const sitePlan = resolveUploadPath(data.unit?.project.sitePlanUrl);

    for (const [title, imagePath] of [
      ['PROJECT IMAGE', heroImage],
      ['UNIT LAYOUT', floorPlan],
      ['FLOOR PLAN', sitePlan],
    ] as const) {
      if (!imagePath) continue;
      doc.addPage();
      drawHeader(doc, data.company, data.number);
      sectionTitle(doc, title, 100);
      try {
        doc.image(imagePath, 40, 130, { fit: [515, 650] });
      } catch {
        // best-effort — skip a corrupt/unreadable image rather than failing the whole document
      }
    }

    doc.end();
  });
}
