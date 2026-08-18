import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx-js-style';
import { Debt, DebtType } from '../storage/finance';
import {
  getDebtPaidAmount, getDebtRemainingAmount, getDebtInstallmentAmount,
  getDebtPaidInstallmentCount, getDebtRemainingInstallmentCount,
  getDebtProgress, getDebtIsCompleted,
} from '../utils/debt';

// Isolated report module — read-only. Never touches mesai.debts.v1 storage,
// the backup payload, or debt math (all amounts come from src/utils/debt.ts).

const DEBT_TYPE_LABELS: Record<DebtType, [string, string]> = {
  credit_card: ['Kredi Kartı', 'Credit Card'],
  personal_loan: ['İhtiyaç Kredisi', 'Personal Loan'],
  vehicle_loan: ['Taşıt Kredisi', 'Vehicle Loan'],
  housing_loan: ['Konut Kredisi', 'Housing Loan'],
  other: ['Diğer', 'Other'],
};
function debtTypeLabel(type: DebtType, isTr: boolean): string {
  const pair = DEBT_TYPE_LABELS[type];
  return pair ? (isTr ? pair[0] : pair[1]) : type;
}

function fmtMoney(n: number, isTr: boolean): string {
  const locale = isTr ? 'tr-TR' : 'en-US';
  return `₺${(Number.isFinite(n) ? n : 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPercent(n: number, isTr: boolean): string {
  const s = (Number.isFinite(n) ? n : 0).toFixed(2);
  return isTr ? `%${s.replace('.', ',')}` : `${s}%`;
}

// No real due-date calendar exists — this is an approximation (sum of
// monthlyPayment across debts not yet fully paid), not a scheduled amount.
function plannedMonthlyPayment(debts: Debt[]): number {
  return debts.reduce((sum, d) => sum + (getDebtIsCompleted(d) ? 0 : (Number.isFinite(d.monthlyPayment) ? d.monthlyPayment : 0)), 0);
}

// Strips filesystem-unsafe characters from a user-entered debt name for use
// in a file name. Never invents a name — falls back to a generic label only
// if sanitizing leaves nothing usable.
function sanitizeFileName(name: string): string {
  const cleaned = (name || '').replace(/[\/\\:*?"<>|]/g, '').trim().replace(/\s+/g, '_');
  return cleaned || 'Borc';
}

async function shareFile(path: string, mimeType: string, dialogTitle: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType, dialogTitle, UTI: mimeType });
  } else {
    throw new Error('Sharing not available');
  }
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- PDF ----------

function baseStyles(): string {
  return `
    @page { size: A4; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; font-size: 9.5px; background: #ffffff; }
    .official-title { text-align: center; padding: 6px 0 4px; border-top: 3px solid #7C3AED; border-bottom: 1px solid #7C3AED; margin-bottom: 8px; }
    .official-title .h1 { font-size: 15px; font-weight: 900; letter-spacing: 1.5px; color: #7C3AED; }
    .official-title .h2 { font-size: 8.5px; color: #475569; letter-spacing: 0.8px; margin-top: 2px; text-transform: uppercase; }
    .meta { text-align: center; font-size: 9px; color: #6b7280; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px; }
    .info-block { padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; }
    .info-block .label { font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 2px; }
    .info-block .value { font-size: 11px; font-weight: 800; color: #111827; }
    h2.section-title { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.6px; color: #7C3AED; margin: 10px 0 4px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #7C3AED; }
    thead { background: #7C3AED; color: #fff; }
    th { padding: 4px 6px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 800; border-right: 1px solid rgba(255,255,255,0.18); }
    th:last-child { border-right: none; }
    th.num, td.num { text-align: right; }
    th.center, td.center { text-align: center; }
    td { padding: 3px 6px; font-size: 8.5px; border-bottom: 1px solid #e5e7eb; }
    tr { page-break-inside: avoid; }
    tbody tr:nth-child(even) { background: #f5f3ff; }
    tbody tr.done td { color: #16a34a; }
    .debt-block { margin-bottom: 12px; page-break-inside: avoid; }
    .debt-block h3 { font-size: 10px; font-weight: 800; color: #111827; margin-bottom: 3px; }
    .footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 7.5px; color: #9ca3af; line-height: 1.4; }
  `;
}

function installmentHistoryRows(debt: Debt, isTr: boolean): string {
  const count = Math.max(0, debt.totalInstallments);
  const rows: string[] = [];
  for (let num = 1; num <= count; num++) {
    const payment = debt.payments.find(p => p.installmentNumber === num);
    const isPaid = !!payment?.paid;
    const amount = getDebtInstallmentAmount(debt, num);
    const dateStr = payment?.paidAt ? new Date(payment.paidAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '-';
    rows.push(`
      <tr class="${isPaid ? 'done' : ''}">
        <td>${isTr ? `${num}. Taksit` : `Installment ${num}`}</td>
        <td class="num">${fmtMoney(amount, isTr)}</td>
        <td class="center">${isPaid ? (isTr ? 'Ödendi' : 'Paid') : (isTr ? 'Bekliyor' : 'Pending')}</td>
        <td class="center">${dateStr}</td>
      </tr>`);
  }
  return rows.join('');
}

function buildDebtsSummaryHtml(debts: Debt[], isTr: boolean): string {
  const reportDate = new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const totalStart = debts.reduce((a, d) => a + (Number.isFinite(d.totalAmount) ? d.totalAmount : 0), 0);
  const totalPaid = debts.reduce((a, d) => a + getDebtPaidAmount(d), 0);
  const totalRemaining = debts.reduce((a, d) => a + getDebtRemainingAmount(d), 0);
  const activeCount = debts.filter(d => !getDebtIsCompleted(d)).length;
  const completedCount = debts.filter(d => getDebtIsCompleted(d)).length;
  const remainingInstallments = debts.reduce((a, d) => a + getDebtRemainingInstallmentCount(d), 0);
  const planned = plannedMonthlyPayment(debts);

  const detailRows = debts.map(d => {
    const paid = getDebtPaidAmount(d);
    const remaining = getDebtRemainingAmount(d);
    const done = getDebtIsCompleted(d);
    return `
      <tr class="${done ? 'done' : ''}">
        <td>${escapeHtml(d.name)}</td>
        <td>${escapeHtml(debtTypeLabel(d.type, isTr))}</td>
        <td class="num">${fmtMoney(d.totalAmount, isTr)}</td>
        <td class="num">${fmtMoney(paid, isTr)}</td>
        <td class="num">${fmtMoney(remaining, isTr)}</td>
        <td class="num">${fmtMoney(d.monthlyPayment, isTr)}</td>
        <td class="center">${d.totalInstallments}</td>
        <td class="center">${getDebtPaidInstallmentCount(d)}</td>
        <td class="center">${getDebtRemainingInstallmentCount(d)}</td>
        <td class="num">${getDebtProgress(d).toFixed(0)}%</td>
        <td class="center">${d.paymentDay ?? '-'}</td>
        <td class="center">${done ? (isTr ? 'Tamamlandı' : 'Completed') : (isTr ? 'Aktif' : 'Active')}</td>
      </tr>`;
  }).join('');

  const historyBlocks = debts.map(d => `
    <div class="debt-block">
      <h3>${escapeHtml(d.name)} — ${escapeHtml(debtTypeLabel(d.type, isTr))}</h3>
      <table>
        <thead><tr>
          <th>${isTr ? 'Taksit' : 'Installment'}</th>
          <th class="num">${isTr ? 'Tutar' : 'Amount'}</th>
          <th class="center">${isTr ? 'Durum' : 'Status'}</th>
          <th class="center">${isTr ? 'Ödeme Tarihi' : 'Paid On'}</th>
        </tr></thead>
        <tbody>${installmentHistoryRows(d, isTr)}</tbody>
      </table>
    </div>`).join('');

  return `
    <!DOCTYPE html>
    <html lang="${isTr ? 'tr' : 'en'}">
    <head><meta charset="UTF-8"><style>${baseStyles()}</style></head>
    <body>
      <div class="official-title">
        <div class="h1">MESAİ+</div>
        <div class="h2">${isTr ? 'BORÇ DURUM RAPORU' : 'DEBT STATUS REPORT'}</div>
      </div>
      <div class="meta">${isTr ? 'Rapor Tarihi' : 'Report Date'}: ${reportDate}</div>

      <h2 class="section-title">${isTr ? 'Genel Özet' : 'General Summary'}</h2>
      <div class="info-grid">
        <div class="info-block"><div class="label">${isTr ? 'Toplam Başlangıç Borcu' : 'Total Starting Debt'}</div><div class="value">${fmtMoney(totalStart, isTr)}</div></div>
        <div class="info-block"><div class="label">${isTr ? 'Toplam Ödenen' : 'Total Paid'}</div><div class="value">${fmtMoney(totalPaid, isTr)}</div></div>
        <div class="info-block"><div class="label">${isTr ? 'Toplam Kalan Borç' : 'Total Remaining'}</div><div class="value">${fmtMoney(totalRemaining, isTr)}</div></div>
        <div class="info-block"><div class="label">${isTr ? 'Aktif Borç Sayısı' : 'Active Debts'}</div><div class="value">${activeCount}</div></div>
        <div class="info-block"><div class="label">${isTr ? 'Tamamlanan Borç Sayısı' : 'Completed Debts'}</div><div class="value">${completedCount}</div></div>
        <div class="info-block"><div class="label">${isTr ? 'Toplam Kalan Taksit' : 'Total Remaining Installments'}</div><div class="value">${remainingInstallments}</div></div>
        <div class="info-block"><div class="label">${isTr ? 'Planlanan Aylık Ödeme' : 'Planned Monthly Payment'}</div><div class="value">${fmtMoney(planned, isTr)}</div></div>
      </div>

      <h2 class="section-title">${isTr ? 'Borç Detayları' : 'Debt Details'}</h2>
      <table>
        <thead><tr>
          <th>${isTr ? 'Borç Adı' : 'Debt Name'}</th>
          <th>${isTr ? 'Tür' : 'Type'}</th>
          <th class="num">${isTr ? 'Toplam' : 'Total'}</th>
          <th class="num">${isTr ? 'Ödenen' : 'Paid'}</th>
          <th class="num">${isTr ? 'Kalan' : 'Remaining'}</th>
          <th class="num">${isTr ? 'Aylık' : 'Monthly'}</th>
          <th class="center">${isTr ? 'Taksit' : 'Inst.'}</th>
          <th class="center">${isTr ? 'Ödenen T.' : 'Paid Inst.'}</th>
          <th class="center">${isTr ? 'Kalan T.' : 'Left Inst.'}</th>
          <th class="num">${isTr ? 'İlerleme' : 'Progress'}</th>
          <th class="center">${isTr ? 'Öd. Günü' : 'Pay Day'}</th>
          <th class="center">${isTr ? 'Durum' : 'Status'}</th>
        </tr></thead>
        <tbody>${detailRows || `<tr><td colspan="12" style="text-align:center;padding:14px;color:#9ca3af;">${isTr ? 'Borç kaydı yok' : 'No debts'}</td></tr>`}</tbody>
      </table>

      <h2 class="section-title">${isTr ? 'Taksit Geçmişi' : 'Installment History'}</h2>
      ${historyBlocks || `<div style="text-align:center;color:#9ca3af;padding:14px;">${isTr ? 'Taksit kaydı yok' : 'No installments'}</div>`}

      <div class="footer">
        <div>${isTr ? 'Bu rapor Mesai+ tarafından otomatik olarak oluşturulmuştur.' : 'This report was automatically generated by Mesai+.'}</div>
        <div>${isTr ? 'Veriler yalnızca cihazınızda saklanır.' : 'Data is stored only on your device.'}</div>
      </div>
    </body>
    </html>
  `;
}

function buildSingleDebtHtml(debt: Debt, isTr: boolean): string {
  const reportDate = new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const paid = getDebtPaidAmount(debt);
  const remaining = getDebtRemainingAmount(debt);
  const paidCount = getDebtPaidInstallmentCount(debt);
  const progress = getDebtProgress(debt);
  const done = getDebtIsCompleted(debt);

  return `
    <!DOCTYPE html>
    <html lang="${isTr ? 'tr' : 'en'}">
    <head><meta charset="UTF-8"><style>${baseStyles()}</style></head>
    <body>
      <div class="official-title">
        <div class="h1">MESAİ+</div>
        <div class="h2">${isTr ? 'BORÇ DETAY RAPORU' : 'DEBT DETAIL REPORT'}</div>
      </div>
      <div class="meta">${isTr ? 'Rapor Tarihi' : 'Report Date'}: ${reportDate}</div>

      <h2 class="section-title">${escapeHtml(debt.name)} — ${escapeHtml(debtTypeLabel(debt.type, isTr))}</h2>
      <div class="info-grid">
        <div class="info-block"><div class="label">${isTr ? 'Toplam' : 'Total'}</div><div class="value">${fmtMoney(debt.totalAmount, isTr)}</div></div>
        <div class="info-block"><div class="label">${isTr ? 'Ödenen' : 'Paid'}</div><div class="value">${fmtMoney(paid, isTr)}</div></div>
        <div class="info-block"><div class="label">${isTr ? 'Kalan' : 'Remaining'}</div><div class="value">${fmtMoney(remaining, isTr)}</div></div>
        <div class="info-block"><div class="label">${isTr ? 'Aylık' : 'Monthly'}</div><div class="value">${fmtMoney(debt.monthlyPayment, isTr)}</div></div>
        <div class="info-block"><div class="label">${isTr ? 'Taksit' : 'Installments'}</div><div class="value">${paidCount} / ${debt.totalInstallments}</div></div>
        <div class="info-block"><div class="label">${isTr ? 'İlerleme' : 'Progress'}</div><div class="value">${fmtPercent(progress, isTr)}</div></div>
      </div>
      ${done ? `<div style="text-align:center;color:#16a34a;font-weight:800;margin-bottom:8px;">${isTr ? 'TAMAMLANDI' : 'COMPLETED'}</div>` : ''}

      <h2 class="section-title">${isTr ? 'Taksit Geçmişi' : 'Installment History'}</h2>
      <table>
        <thead><tr>
          <th>${isTr ? 'Taksit' : 'Installment'}</th>
          <th class="num">${isTr ? 'Tutar' : 'Amount'}</th>
          <th class="center">${isTr ? 'Durum' : 'Status'}</th>
          <th class="center">${isTr ? 'Ödeme Tarihi' : 'Paid On'}</th>
        </tr></thead>
        <tbody>${installmentHistoryRows(debt, isTr)}</tbody>
      </table>

      <div class="footer">
        <div>${isTr ? 'Bu rapor Mesai+ tarafından otomatik olarak oluşturulmuştur.' : 'This report was automatically generated by Mesai+.'}</div>
        <div>${isTr ? 'Veriler yalnızca cihazınızda saklanır.' : 'Data is stored only on your device.'}</div>
      </div>
    </body>
    </html>
  `;
}

export async function shareDebtsPdf(debts: Debt[], language: 'tr' | 'en'): Promise<void> {
  const isTr = language === 'tr';
  const html = buildDebtsSummaryHtml(debts, isTr);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const ts = new Date().toISOString().split('T')[0];
  const path = `${FileSystem.documentDirectory}MesaiPlus_Borc_Raporu_${ts}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: path });
  await shareFile(path, 'application/pdf', isTr ? 'Borç Raporunu Paylaş' : 'Share Debt Report');
}

export async function shareSingleDebtPdf(debt: Debt, language: 'tr' | 'en'): Promise<void> {
  const isTr = language === 'tr';
  const html = buildSingleDebtHtml(debt, isTr);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const ts = new Date().toISOString().split('T')[0];
  const path = `${FileSystem.documentDirectory}MesaiPlus_${sanitizeFileName(debt.name)}_Borc_Raporu_${ts}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: path });
  await shareFile(path, 'application/pdf', isTr ? 'Borç Raporunu Paylaş' : 'Share Debt Report');
}

// ---------- Excel ----------

const XLSX_BLUE = 'FF7C3AED';
const XLSX_WHITE = 'FFFFFFFF';

const xlsxHeaderStyle = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: XLSX_WHITE } },
  fill: { patternType: 'solid', fgColor: { rgb: XLSX_BLUE } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};
const xlsxTitleStyle = {
  font: { name: 'Calibri', sz: 13, bold: true, color: { rgb: XLSX_WHITE } },
  fill: { patternType: 'solid', fgColor: { rgb: XLSX_BLUE } },
};
const xlsxLabelStyle = {
  font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FF374151' } },
};
const xlsxCurrencyStyle = {
  font: { name: 'Calibri', sz: 10, color: { rgb: 'FF111827' } },
  numFmt: '#,##0.00 "₺"',
};

function styleHeaderRow(ws: XLSX.WorkSheet, rowIdx: number, cols: number) {
  for (let c = 0; c < cols; c++) {
    const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
    if (!ws[addr]) ws[addr] = { v: '', t: 's' };
    (ws[addr] as any).s = xlsxHeaderStyle;
  }
}

function setCurrencyCell(ws: XLSX.WorkSheet, r: number, c: number) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  if (cell && typeof cell.v === 'number') {
    cell.t = 'n';
    (cell as any).s = xlsxCurrencyStyle;
  }
}

export async function shareDebtsXlsx(debts: Debt[], language: 'tr' | 'en'): Promise<void> {
  const isTr = language === 'tr';
  const wb = XLSX.utils.book_new();
  const reportDate = new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US');

  const totalStart = debts.reduce((a, d) => a + (Number.isFinite(d.totalAmount) ? d.totalAmount : 0), 0);
  const totalPaid = debts.reduce((a, d) => a + getDebtPaidAmount(d), 0);
  const totalRemaining = debts.reduce((a, d) => a + getDebtRemainingAmount(d), 0);
  const activeCount = debts.filter(d => !getDebtIsCompleted(d)).length;
  const completedCount = debts.filter(d => getDebtIsCompleted(d)).length;
  const remainingInstallments = debts.reduce((a, d) => a + getDebtRemainingInstallmentCount(d), 0);
  const planned = plannedMonthlyPayment(debts);

  // Sheet 1 — BORÇ ÖZETİ
  const ws1 = XLSX.utils.aoa_to_sheet([
    [isTr ? 'MESAİ+ BORÇ DURUM RAPORU' : 'MESAİ+ DEBT STATUS REPORT', ''],
    [isTr ? 'Rapor Tarihi' : 'Report Date', reportDate],
    ['', ''],
    [isTr ? 'Toplam Başlangıç Borcu' : 'Total Starting Debt', totalStart],
    [isTr ? 'Toplam Ödenen' : 'Total Paid', totalPaid],
    [isTr ? 'Toplam Kalan' : 'Total Remaining', totalRemaining],
    [isTr ? 'Aktif Borç' : 'Active Debts', activeCount],
    [isTr ? 'Tamamlanan Borç' : 'Completed Debts', completedCount],
    [isTr ? 'Kalan Taksit' : 'Remaining Installments', remainingInstallments],
    [isTr ? 'Planlanan Aylık Ödeme' : 'Planned Monthly Payment', planned],
  ]);
  for (let c = 0; c < 2; c++) {
    const a = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws1[a]) ws1[a] = { v: '', t: 's' };
    (ws1[a] as any).s = xlsxTitleStyle;
  }
  [3, 4, 5, 6, 7, 8, 9].forEach(r => {
    const labelAddr = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws1[labelAddr]) (ws1[labelAddr] as any).s = xlsxLabelStyle;
  });
  [3, 4, 5, 9].forEach(r => setCurrencyCell(ws1, r, 1));
  ws1['!cols'] = [{ wch: 28 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws1, isTr ? 'BORÇ ÖZETİ' : 'DEBT SUMMARY');

  // Sheet 2 — BORÇ DETAYLARI
  const detailHeader = [
    isTr ? 'Borç Adı' : 'Debt Name', isTr ? 'Tür' : 'Type', isTr ? 'Toplam Borç' : 'Total',
    isTr ? 'Aylık Ödeme' : 'Monthly', isTr ? 'Toplam Taksit' : 'Total Inst.', isTr ? 'Ödenen Taksit' : 'Paid Inst.',
    isTr ? 'Kalan Taksit' : 'Left Inst.', isTr ? 'Ödenen Tutar' : 'Paid Amount', isTr ? 'Kalan Borç' : 'Remaining',
    isTr ? 'İlerleme %' : 'Progress %', isTr ? 'Ödeme Günü' : 'Pay Day', isTr ? 'Durum' : 'Status',
  ];
  const detailRows = debts.map(d => [
    d.name, debtTypeLabel(d.type, isTr), d.totalAmount, d.monthlyPayment,
    d.totalInstallments, getDebtPaidInstallmentCount(d), getDebtRemainingInstallmentCount(d),
    getDebtPaidAmount(d), getDebtRemainingAmount(d), Number(getDebtProgress(d).toFixed(2)),
    d.paymentDay ?? '-', getDebtIsCompleted(d) ? (isTr ? 'Tamamlandı' : 'Completed') : (isTr ? 'Aktif' : 'Active'),
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows]);
  styleHeaderRow(ws2, 0, detailHeader.length);
  detailRows.forEach((_, i) => { setCurrencyCell(ws2, i + 1, 2); setCurrencyCell(ws2, i + 1, 3); setCurrencyCell(ws2, i + 1, 7); setCurrencyCell(ws2, i + 1, 8); });
  ws2['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 9 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, isTr ? 'BORÇ DETAYLARI' : 'DEBT DETAILS');

  // Sheet 3 — TAKSİT GEÇMİŞİ
  const historyHeader = [isTr ? 'Borç Adı' : 'Debt Name', isTr ? 'Borç Türü' : 'Debt Type', isTr ? 'Taksit No' : 'Inst. No', isTr ? 'Taksit Tutarı' : 'Inst. Amount', isTr ? 'Durum' : 'Status', isTr ? 'Ödeme Tarihi' : 'Paid Date'];
  const historyRows: any[][] = [];
  debts.forEach(d => {
    const count = Math.max(0, d.totalInstallments);
    for (let num = 1; num <= count; num++) {
      const payment = d.payments.find(p => p.installmentNumber === num);
      const isPaid = !!payment?.paid;
      historyRows.push([
        d.name, debtTypeLabel(d.type, isTr), num, getDebtInstallmentAmount(d, num),
        isPaid ? (isTr ? 'Ödendi' : 'Paid') : (isTr ? 'Bekliyor' : 'Pending'),
        payment?.paidAt ? new Date(payment.paidAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '-',
      ]);
    }
  });
  const ws3 = XLSX.utils.aoa_to_sheet([historyHeader, ...historyRows]);
  styleHeaderRow(ws3, 0, historyHeader.length);
  historyRows.forEach((_, i) => setCurrencyCell(ws3, i + 1, 3));
  ws3['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws3, isTr ? 'TAKSİT GEÇMİŞİ' : 'INSTALLMENT HISTORY');

  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx', cellStyles: true } as any);
  const ts = new Date().toISOString().split('T')[0];
  const path = `${FileSystem.documentDirectory}MesaiPlus_Borc_Raporu_${ts}.xlsx`;
  await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
  await shareFile(path, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isTr ? 'Borç Raporunu Paylaş' : 'Share Debt Report');
}

export async function shareSingleDebtXlsx(debt: Debt, language: 'tr' | 'en'): Promise<void> {
  const isTr = language === 'tr';
  const wb = XLSX.utils.book_new();
  const reportDate = new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US');
  const paid = getDebtPaidAmount(debt);
  const remaining = getDebtRemainingAmount(debt);

  // Sheet 1 — BORÇ DETAYI
  const ws1 = XLSX.utils.aoa_to_sheet([
    [isTr ? 'MESAİ+ BORÇ DETAY RAPORU' : 'MESAİ+ DEBT DETAIL REPORT', ''],
    [isTr ? 'Rapor Tarihi' : 'Report Date', reportDate],
    ['', ''],
    [isTr ? 'Borç Adı' : 'Debt Name', debt.name],
    [isTr ? 'Tür' : 'Type', debtTypeLabel(debt.type, isTr)],
    [isTr ? 'Toplam Borç' : 'Total Amount', debt.totalAmount],
    [isTr ? 'Ödenen' : 'Paid', paid],
    [isTr ? 'Kalan' : 'Remaining', remaining],
    [isTr ? 'Aylık Ödeme' : 'Monthly Payment', debt.monthlyPayment],
    [isTr ? 'Toplam Taksit' : 'Total Installments', debt.totalInstallments],
    [isTr ? 'Ödenen Taksit' : 'Paid Installments', getDebtPaidInstallmentCount(debt)],
    [isTr ? 'Kalan Taksit' : 'Remaining Installments', getDebtRemainingInstallmentCount(debt)],
    [isTr ? 'İlerleme %' : 'Progress %', Number(getDebtProgress(debt).toFixed(2))],
    [isTr ? 'Ödeme Günü' : 'Payment Day', debt.paymentDay ?? '-'],
    [isTr ? 'Durum' : 'Status', getDebtIsCompleted(debt) ? (isTr ? 'Tamamlandı' : 'Completed') : (isTr ? 'Aktif' : 'Active')],
  ]);
  for (let c = 0; c < 2; c++) {
    const a = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws1[a]) ws1[a] = { v: '', t: 's' };
    (ws1[a] as any).s = xlsxTitleStyle;
  }
  [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].forEach(r => {
    const labelAddr = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws1[labelAddr]) (ws1[labelAddr] as any).s = xlsxLabelStyle;
  });
  [5, 6, 7, 8].forEach(r => setCurrencyCell(ws1, r, 1));
  ws1['!cols'] = [{ wch: 24 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws1, isTr ? 'BORÇ DETAYI' : 'DEBT DETAIL');

  // Sheet 2 — TAKSİT GEÇMİŞİ
  const historyHeader = [isTr ? 'Taksit No' : 'Inst. No', isTr ? 'Taksit Tutarı' : 'Inst. Amount', isTr ? 'Durum' : 'Status', isTr ? 'Ödeme Tarihi' : 'Paid Date'];
  const count = Math.max(0, debt.totalInstallments);
  const historyRows: any[][] = [];
  for (let num = 1; num <= count; num++) {
    const payment = debt.payments.find(p => p.installmentNumber === num);
    const isPaid = !!payment?.paid;
    historyRows.push([
      num, getDebtInstallmentAmount(debt, num),
      isPaid ? (isTr ? 'Ödendi' : 'Paid') : (isTr ? 'Bekliyor' : 'Pending'),
      payment?.paidAt ? new Date(payment.paidAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '-',
    ]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet([historyHeader, ...historyRows]);
  styleHeaderRow(ws2, 0, historyHeader.length);
  historyRows.forEach((_, i) => setCurrencyCell(ws2, i + 1, 1));
  ws2['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws2, isTr ? 'TAKSİT GEÇMİŞİ' : 'INSTALLMENT HISTORY');

  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx', cellStyles: true } as any);
  const ts = new Date().toISOString().split('T')[0];
  const path = `${FileSystem.documentDirectory}MesaiPlus_${sanitizeFileName(debt.name)}_Borc_Raporu_${ts}.xlsx`;
  await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
  await shareFile(path, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isTr ? 'Borç Raporunu Paylaş' : 'Share Debt Report');
}
