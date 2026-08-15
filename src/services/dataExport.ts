import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as XLSX from 'xlsx-js-style';
import { WorkEntry } from '../storage/db';

const APP = 'Mesai+';

function buildRows(entries: Record<string, WorkEntry>) {
  const list = Object.values(entries || {}).filter((e) => e?.date);
  list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return list.map((e) => ({
    Tarih: e.date,
    'Gün Tipi': e.dayType,
    Saat: Number(e.hours || 0),
    Çarpan: Number(e.multiplier || 1),
    'Devamsızlık': e.isAbsence ? 'Evet' : 'Hayır',
    Kazanç_TL: Number((e.earnings || 0).toFixed(2)),
  }));
}

async function shareFile(path: string, mimeType: string, dialogTitle: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType, dialogTitle, UTI: mimeType });
  } else {
    throw new Error('Sharing not available');
  }
}

export async function exportCsv(entries: Record<string, WorkEntry>): Promise<void> {
  const rows = buildRows(entries);
  if (rows.length === 0) throw new Error('NO_DATA');
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = (r as any)[h];
          const s = v == null ? '' : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    ),
  ];
  // BOM for Excel UTF-8 compatibility
  const csv = '\uFEFF' + lines.join('\n');
  const ts = new Date().toISOString().split('T')[0];
  const path = `${FileSystem.documentDirectory}${APP}_export_${ts}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(path, 'text/csv', 'CSV Dışa Aktar');
}

export async function exportXlsx(entries: Record<string, WorkEntry>): Promise<void> {
  const rows = buildRows(entries);
  if (rows.length === 0) throw new Error('NO_DATA');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mesai');
  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const ts = new Date().toISOString().split('T')[0];
  const path = `${FileSystem.documentDirectory}${APP}_export_${ts}.xlsx`;
  await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
  await shareFile(path, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Excel Dışa Aktar');
}

// ---------- Styled monthly Excel report (mirrors PDF design) ----------

interface MonthlyReportData {
  monthName: string;
  monthIndex: number;
  year: number;
  salary: number;
  hourlyRate: number;
  firstName: string;
  lastName: string;
  email: string;
  entries: any[];
}

const BLUE = 'FF1D4ED8';
const BLUE_SOFT = 'FFEFF6FF';
const ZEBRA = 'FFF3F6FB';
const WHITE = 'FFFFFFFF';
const GRAY = 'FF6B7280';
const RED = 'FFB91C1C';

function aoaToSheetWithStyles(rows: any[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(rows);
}

function setCell(ws: XLSX.WorkSheet, addr: string, value: any, style?: any, type: 'n' | 's' = 's', formula?: string) {
  const cell: any = { v: value, t: type };
  if (formula) { cell.f = formula; }
  if (style) cell.s = style;
  ws[addr] = cell;
}

const titleStyle = {
  font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: 'FFFFFFFF' } },
  fill: { patternType: 'solid', fgColor: { rgb: BLUE } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    top: { style: 'medium', color: { rgb: BLUE } },
    bottom: { style: 'medium', color: { rgb: BLUE } },
  },
};
const subtitleStyle = {
  font: { name: 'Calibri', sz: 10, italic: true, color: { rgb: GRAY.slice(2) ? GRAY : 'FF6B7280' } },
  alignment: { horizontal: 'center' },
};
const sectionStyle = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FF1D4ED8' } },
  fill: { patternType: 'solid', fgColor: { rgb: BLUE_SOFT } },
  alignment: { horizontal: 'left', vertical: 'center' },
};
const labelStyle = {
  font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FF374151' } },
  alignment: { horizontal: 'left', vertical: 'center' },
};
const valueStyle = {
  font: { name: 'Calibri', sz: 10, color: { rgb: 'FF111827' } },
  alignment: { horizontal: 'left', vertical: 'center' },
};
const thStyle = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFFFF' } },
  fill: { patternType: 'solid', fgColor: { rgb: BLUE } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: BLUE } },
    bottom: { style: 'thin', color: { rgb: BLUE } },
    left: { style: 'thin', color: { rgb: 'FFFFFFFF' } },
    right: { style: 'thin', color: { rgb: 'FFFFFFFF' } },
  },
};
const tdStyle = (zebra: boolean, align: 'left' | 'right' | 'center' = 'left', red = false) => ({
  font: { name: 'Calibri', sz: 10, color: { rgb: red ? RED : 'FF111827' }, italic: red },
  fill: { patternType: 'solid', fgColor: { rgb: zebra ? ZEBRA : WHITE } },
  alignment: { horizontal: align, vertical: 'center' },
  border: {
    top: { style: 'hair', color: { rgb: 'FFE5E7EB' } },
    bottom: { style: 'hair', color: { rgb: 'FFE5E7EB' } },
  },
});
const summaryLabelStyle = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FF1D4ED8' } },
  fill: { patternType: 'solid', fgColor: { rgb: BLUE_SOFT } },
  alignment: { horizontal: 'left', vertical: 'center' },
};
const summaryValueStyle = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FF1D4ED8' } },
  fill: { patternType: 'solid', fgColor: { rgb: BLUE_SOFT } },
  alignment: { horizontal: 'right', vertical: 'center' },
  numFmt: '#,##0.00 "₺"',
};
const grandTotalLabelStyle = {
  font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFFFF' } },
  fill: { patternType: 'solid', fgColor: { rgb: BLUE } },
  alignment: { horizontal: 'left', vertical: 'center' },
};
const grandTotalValueStyle = {
  font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFFFF' } },
  fill: { patternType: 'solid', fgColor: { rgb: BLUE } },
  alignment: { horizontal: 'right', vertical: 'center' },
  numFmt: '#,##0.00 "₺"',
};
const footerStyle = {
  font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: 'FF9CA3AF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};

export async function exportMonthlyStyledXlsx(rd: MonthlyReportData, language: 'tr' | 'en' = 'tr'): Promise<void> {
  const isTr = language === 'tr';
  const reportNo = `MS-${rd.year}${String(rd.monthIndex + 1).padStart(2, '0')}-${Date.now().toString().slice(-5)}`;
  const issued = new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US');
  const fullName = `${rd.firstName ?? ''} ${rd.lastName ?? ''}`.trim() || '—';

  const dayTypeLabel = (t: string) => {
    const map: Record<string, [string, string]> = {
      weekday: ['Hafta İçi', 'Weekday'],
      saturday: ['Cumartesi', 'Saturday'],
      sunday: ['Pazar', 'Sunday'],
      holiday: ['Resmi Tatil', 'Holiday'],
    };
    const e = map[t]; return e ? (isTr ? e[0] : e[1]) : t;
  };

  // Build empty 6-col grid
  const COLS = 6;
  const rows: any[][] = [];
  // 1 Title
  rows.push([isTr ? 'MESAİ+ AYLIK ÇALIŞMA RAPORU' : 'MESAİ+ MONTHLY WORK REPORT', '', '', '', '', '']);
  // 2 Subtitle
  rows.push([isTr ? 'Resmî Mesai Çizelgesi' : 'Official Overtime Schedule', '', '', '', '', '']);
  rows.push(Array(COLS).fill(''));
  // 4 Report meta
  rows.push([isTr ? 'Rapor No' : 'Report No', reportNo, '', isTr ? 'Düzenlenme' : 'Issued', issued, '']);
  rows.push([isTr ? 'Dönem' : 'Period', `${rd.monthName} ${rd.year}`, '', isTr ? 'Uygulama' : 'App', 'Mesai+', '']);
  rows.push(Array(COLS).fill(''));
  // 7 Section: Personel
  rows.push([isTr ? 'PERSONEL BİLGİLERİ' : 'EMPLOYEE INFORMATION', '', '', '', '', '']);
  rows.push([isTr ? 'Ad Soyad' : 'Full Name', fullName, '', isTr ? 'E-Posta' : 'Email', rd.email || '—', '']);
  rows.push([isTr ? 'Aylık Net Maaş' : 'Monthly Net Salary', rd.salary, '', isTr ? 'Saatlik Ücret' : 'Hourly Rate', rd.hourlyRate, '']);
  rows.push(Array(COLS).fill(''));
  // 11 Section: Daily breakdown
  rows.push([isTr ? 'GÜNLÜK MESAİ DÖKÜMÜ' : 'DAILY WORK BREAKDOWN', '', '', '', '', '']);
  // 12 Headers
  const headerRowIdx = rows.length;
  rows.push([
    isTr ? 'Tarih' : 'Date',
    isTr ? 'Gün' : 'Day',
    isTr ? 'Saat' : 'Hours',
    isTr ? 'Mesai Oranı' : 'Rate',
    isTr ? 'Saat Ücreti (₺)' : 'Hourly (₺)',
    isTr ? 'Hakedilen (₺)' : 'Earned (₺)',
  ]);
  // Data rows
  const dataStartIdx = rows.length;
  let totalHours = 0;
  let totalEarnings = 0;
  rd.entries.forEach((e: any) => {
    const date = new Date(e.date);
    const dateStr = date.toLocaleDateString(isTr ? 'tr-TR' : 'en-US');
    const hours = Number(e.hours) || 0;
    const mult = Number(e.multiplier) || 1;
    const earn = Number(e.earnings) || hours * rd.hourlyRate * mult;
    totalHours += hours; totalEarnings += earn;
    const dayName = date.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { weekday: 'short' });
    rows.push([
      dateStr,
      dayName,
      hours,
      mult,
      Number(rd.hourlyRate.toFixed(2)),
      Number(earn.toFixed(2)),
    ]);
  });
  if (rd.entries.length === 0) {
    rows.push([isTr ? 'Bu döneme ait mesai kaydı bulunmamaktadır.' : 'No entries for this period.', '', '', '', '', '']);
  }
  const dataEndIdx = rows.length - 1;

  rows.push(Array(COLS).fill(''));
  // Summary section
  const sumStartIdx = rows.length;
  rows.push([isTr ? 'Çalışılan Gün' : 'Work Days', '', '', '', '', rd.entries.length]);
  rows.push([isTr ? 'Toplam Saat' : 'Total Hours', '', '', '', '', null]);
  rows.push([isTr ? 'TOPLAM HAKEDİŞ' : 'TOTAL EARNED', '', '', '', '', null]);
  rows.push(Array(COLS).fill(''));
  rows.push([isTr ? 'İmza / Onay' : 'Signature / Approval', '', '', '', '', '']);
  rows.push(Array(COLS).fill(''));
  rows.push([isTr
    ? 'Bu rapor Mesai+ tarafından oluşturulmuştur. Veriler cihazınızda saklanır.'
    : 'This report was generated by Mesai+. Data stays on your device.', '', '', '', '', '']);

  const ws = aoaToSheetWithStyles(rows);

  // Helper to translate (row, col) → A1
  const A1 = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

  // Apply styles
  // Row 0: title across 6 cols
  for (let c = 0; c < COLS; c++) {
    const a = A1(0, c);
    if (!ws[a]) ws[a] = { v: '', t: 's' };
    (ws[a] as any).s = titleStyle;
  }
  for (let c = 0; c < COLS; c++) {
    const a = A1(1, c);
    if (!ws[a]) ws[a] = { v: '', t: 's' };
    (ws[a] as any).s = subtitleStyle;
  }
  // Meta rows 3 & 4
  [3, 4].forEach((r) => {
    [0, 3].forEach((c) => { const a = A1(r, c); if (ws[a]) (ws[a] as any).s = labelStyle; });
    [1, 4].forEach((c) => { const a = A1(r, c); if (ws[a]) (ws[a] as any).s = valueStyle; });
  });
  // Section heading row 6
  for (let c = 0; c < COLS; c++) {
    const a = A1(6, c); if (!ws[a]) ws[a] = { v: '', t: 's' }; (ws[a] as any).s = sectionStyle;
  }
  // Personel rows 7,8
  [7, 8].forEach((r) => {
    [0, 3].forEach((c) => { const a = A1(r, c); if (ws[a]) (ws[a] as any).s = labelStyle; });
    [1, 4].forEach((c) => {
      const a = A1(r, c);
      if (ws[a]) {
        const isCurrency = r === 8;
        (ws[a] as any).s = isCurrency
          ? { ...valueStyle, numFmt: '#,##0.00 "₺"' }
          : valueStyle;
        if (isCurrency && typeof ws[a].v === 'number') ws[a].t = 'n';
      }
    });
  });
  // Section: daily 10
  for (let c = 0; c < COLS; c++) {
    const a = A1(10, c); if (!ws[a]) ws[a] = { v: '', t: 's' }; (ws[a] as any).s = sectionStyle;
  }
  // Header row 11
  for (let c = 0; c < COLS; c++) {
    const a = A1(headerRowIdx, c); if (ws[a]) (ws[a] as any).s = thStyle;
  }
  // Data rows
  for (let r = dataStartIdx; r <= dataEndIdx; r++) {
    const zebra = (r - dataStartIdx) % 2 === 1;
    const isAbs = rd.entries[r - dataStartIdx]?.isAbsence;
    for (let c = 0; c < COLS; c++) {
      const a = A1(r, c); if (!ws[a]) ws[a] = { v: '', t: 's' };
      const align: 'left' | 'right' | 'center' = c === 0 || c === 1 ? 'left' : 'right';
      const st: any = tdStyle(zebra, align, !!isAbs);
      if (c === 5 || c === 4) st.numFmt = '#,##0.00 "₺"';
      if (c === 3) st.numFmt = '"×"0.00';
      if (c === 2) st.numFmt = '0.0';
      (ws[a] as any).s = st;
    }
  }
  // Summary rows: sumStartIdx, +1, +2
  // Total Hours formula
  const hoursColLetter = XLSX.utils.encode_col(2);
  const earnColLetter = XLSX.utils.encode_col(5);
  if (rd.entries.length > 0) {
    const hoursRange = `${hoursColLetter}${dataStartIdx + 1}:${hoursColLetter}${dataEndIdx + 1}`;
    const earnRange = `${earnColLetter}${dataStartIdx + 1}:${earnColLetter}${dataEndIdx + 1}`;
    setCell(ws, A1(sumStartIdx + 1, 5), totalHours, { ...summaryValueStyle, numFmt: '0.0' }, 'n', `SUM(${hoursRange})`);
    setCell(ws, A1(sumStartIdx + 2, 5), Number(totalEarnings.toFixed(2)), grandTotalValueStyle, 'n', `SUM(${earnRange})`);
  } else {
    setCell(ws, A1(sumStartIdx + 1, 5), 0, { ...summaryValueStyle, numFmt: '0.0' }, 'n');
    setCell(ws, A1(sumStartIdx + 2, 5), 0, grandTotalValueStyle, 'n');
  }
  // Style summary labels & empty cells
  for (let c = 0; c < COLS; c++) {
    [sumStartIdx, sumStartIdx + 1].forEach((r) => {
      const a = A1(r, c); if (!ws[a]) ws[a] = { v: '', t: 's' };
      (ws[a] as any).s = c === 0 ? summaryLabelStyle : (c === 5 ? (ws[a] as any).s || summaryValueStyle : { fill: { patternType: 'solid', fgColor: { rgb: BLUE_SOFT } } });
    });
    const a = A1(sumStartIdx + 2, c);
    if (!ws[a]) ws[a] = { v: '', t: 's' };
    (ws[a] as any).s = c === 0 ? grandTotalLabelStyle : (c === 5 ? (ws[a] as any).s || grandTotalValueStyle : { fill: { patternType: 'solid', fgColor: { rgb: BLUE } } });
  }
  // Set fixed numeric for work days
  const wdCell = A1(sumStartIdx, 5);
  if (ws[wdCell]) { (ws[wdCell] as any).t = 'n'; (ws[wdCell] as any).s = { ...summaryValueStyle, numFmt: '0' }; }

  // Signature label
  const sigRow = sumStartIdx + 4;
  for (let c = 0; c < COLS; c++) {
    const a = A1(sigRow, c); if (!ws[a]) ws[a] = { v: '', t: 's' };
    (ws[a] as any).s = c === 0 ? sectionStyle : { fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFFFF' } } };
  }
  // Footer
  const footerRow = sigRow + 2;
  for (let c = 0; c < COLS; c++) {
    const a = A1(footerRow, c); if (!ws[a]) ws[a] = { v: '', t: 's' };
    (ws[a] as any).s = footerStyle;
  }

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: COLS - 1 } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: COLS - 1 } },
    { s: { r: sumStartIdx, c: 0 }, e: { r: sumStartIdx, c: 4 } },
    { s: { r: sumStartIdx + 1, c: 0 }, e: { r: sumStartIdx + 1, c: 4 } },
    { s: { r: sumStartIdx + 2, c: 0 }, e: { r: sumStartIdx + 2, c: 4 } },
    { s: { r: sigRow, c: 3 }, e: { r: sigRow, c: 5 } },
    { s: { r: footerRow, c: 0 }, e: { r: footerRow, c: COLS - 1 } },
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
  ];
  // Row heights
  ws['!rows'] = [
    { hpt: 28 }, { hpt: 16 }, { hpt: 8 }, { hpt: 18 }, { hpt: 18 }, { hpt: 8 },
    { hpt: 22 }, { hpt: 18 }, { hpt: 18 }, { hpt: 8 },
    { hpt: 22 }, { hpt: 22 },
  ];
  // Freeze pane below header row
  ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 };
  (ws as any)['!sheetView'] = [{ state: 'frozen', ySplit: headerRowIdx + 1 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isTr ? 'Mesai Raporu' : 'Work Report');
  // cellStyles required to keep .s on each cell
  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx', cellStyles: true } as any);
  const ts = new Date().toISOString().split('T')[0];
  const path = `${FileSystem.documentDirectory}${APP}_${rd.monthName}_${rd.year}_${ts}.xlsx`;
  await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
  await shareFile(path, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Excel D\u0131\u015fa Aktar');
}

// ---------- Backup / Restore ----------
const BACKUP_KEYS = [
  'mesai.entries.v1',
  'mesai.settings.v1',
  'mesai.language.v1',
  'mesai.theme.v1',
  'mesai.leave.startDate.v2',
  'mesai.leave.usedDays.v2',
  'mesai.leave.days.v2',
];

const CURRENT_BACKUP_VERSION = 1;

export interface BackupPayload {
  app: string;
  version: number;
  createdAt: string;
  data: Record<string, unknown>;
}

// Backward-compatible extension of the existing { ok, message } contract:
// `mismatch` is only present when message === 'OWNER_MISMATCH'.
export interface BackupImportResult {
  ok: boolean;
  message: string;
  mismatch?: {
    backupEmail: string;
    currentEmail: string;
    data: Record<string, unknown>;
  };
}

function normalizeEmail(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

// ---------- Backup payload validation (side-effect free) ----------
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

const DAY_TYPES = new Set(['weekday', 'saturday', 'sunday', 'holiday']);
const LEAVE_TYPES = new Set(['annual', 'excuse', 'sick', 'unpaid']);

function isValidSettings(v: unknown): boolean {
  if (!isPlainObject(v)) return false;
  if (v.firstName !== undefined && typeof v.firstName !== 'string') return false;
  if (v.lastName !== undefined && typeof v.lastName !== 'string') return false;
  if (v.email !== undefined && typeof v.email !== 'string') return false;
  if (v.updatedAt !== undefined && typeof v.updatedAt !== 'string') return false;
  if (v.notificationsEnabled !== undefined && typeof v.notificationsEnabled !== 'boolean') return false;
  if (v.notificationTime !== undefined && typeof v.notificationTime !== 'string') return false;
  if (v.startDate !== undefined && typeof v.startDate !== 'string') return false;
  if (v.monthlyGoal !== undefined && !isFiniteNumber(v.monthlyGoal)) return false;
  if (v.monthlySalaries !== undefined) {
    if (!isPlainObject(v.monthlySalaries)) return false;
    for (const val of Object.values(v.monthlySalaries)) {
      if (!isFiniteNumber(val)) return false;
    }
  }
  if (v.activeWorkplaceId !== undefined && typeof v.activeWorkplaceId !== 'string') return false;
  if (v.workplaces !== undefined) {
    if (!Array.isArray(v.workplaces)) return false;
    for (const w of v.workplaces) {
      if (!isPlainObject(w)) return false;
      if (typeof w.id !== 'string' || typeof w.name !== 'string') return false;
    }
  }
  return true;
}

function isValidEntries(v: unknown): boolean {
  if (!isPlainObject(v)) return false;
  for (const entry of Object.values(v)) {
    if (!isPlainObject(entry)) return false;
    if (typeof entry.date !== 'string') return false;
    if (!isFiniteNumber(entry.hours)) return false;
    if (typeof entry.isAbsence !== 'boolean') return false;
    if (typeof entry.dayType !== 'string' || !DAY_TYPES.has(entry.dayType)) return false;
    if (!isFiniteNumber(entry.multiplier)) return false;
    if (!isFiniteNumber(entry.earnings)) return false;
    if (entry.updatedAt !== undefined && typeof entry.updatedAt !== 'string') return false;
    if (entry.customMultiplier !== undefined && !isFiniteNumber(entry.customMultiplier)) return false;
    if (entry.workplaceId !== undefined && typeof entry.workplaceId !== 'string') return false;
  }
  return true;
}

function isValidLanguage(v: unknown): boolean {
  return v === 'tr' || v === 'en';
}

function isValidTheme(v: unknown): boolean {
  return v === 'dark' || v === 'light' || v === 'system';
}

function isValidLeaveStartDate(v: unknown): boolean {
  return typeof v === 'string' && !isNaN(new Date(v).getTime());
}

function isValidLeaveDays(v: unknown): boolean {
  if (!Array.isArray(v)) return false;
  for (const d of v) {
    if (!isPlainObject(d)) return false;
    if (typeof d.date !== 'string') return false;
    if (typeof d.type !== 'string' || !LEAVE_TYPES.has(d.type)) return false;
    if (d.note !== undefined && typeof d.note !== 'string') return false;
  }
  return true;
}

function isValidLeaveUsedLegacy(v: unknown): boolean {
  return isFiniteNumber(v) || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)));
}

// Low-risk fields: if invalid, skip just that key and keep the current value
// instead of rejecting the whole import.
const OPTIONAL_KEY_VALIDATORS: Record<string, (v: unknown) => boolean> = {
  'mesai.language.v1': isValidLanguage,
  'mesai.theme.v1': isValidTheme,
  'mesai.leave.startDate.v2': isValidLeaveStartDate,
  'mesai.leave.days.v2': isValidLeaveDays,
  'mesai.leave.usedDays.v2': isValidLeaveUsedLegacy,
};

export async function exportBackup(): Promise<void> {
  const data: Record<string, unknown> = {};
  for (const k of BACKUP_KEYS) {
    const raw = await AsyncStorage.getItem(k);
    if (raw != null) {
      try { data[k] = JSON.parse(raw); } catch { data[k] = raw; }
    }
  }
  const payload: BackupPayload = {
    app: APP,
    version: 1,
    createdAt: new Date().toISOString(),
    data,
  };
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `${FileSystem.documentDirectory}${APP}_yedek_${ts}.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await shareFile(path, 'application/json', 'Yedek Paylaş');
}

// Applies already-validated backup data to AsyncStorage. Re-runs the settings/
// entries validators defensively so this step can never bypass validation,
// regardless of which caller (direct import or a post-confirmation import)
// invokes it.
async function writeBackupData(data: Record<string, unknown>): Promise<BackupImportResult> {
  if ('mesai.settings.v1' in data && !isValidSettings(data['mesai.settings.v1'])) {
    return { ok: false, message: 'INVALID_FORMAT' };
  }
  if ('mesai.entries.v1' in data && !isValidEntries(data['mesai.entries.v1'])) {
    return { ok: false, message: 'INVALID_FORMAT' };
  }
  for (const k of BACKUP_KEYS) {
    if (!(k in data)) continue;
    const validateOptional = OPTIONAL_KEY_VALIDATORS[k];
    if (validateOptional && !validateOptional(data[k])) continue;
    await AsyncStorage.setItem(k, JSON.stringify(data[k]));
  }
  return { ok: true, message: 'OK' };
}

export async function importBackup(): Promise<BackupImportResult> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets || res.assets.length === 0) {
    return { ok: false, message: 'CANCELLED' };
  }
  const uri = res.assets[0].uri;
  const raw = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  let parsed: BackupPayload;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'INVALID_JSON' };
  }
  if (!parsed || parsed.app !== APP || !isPlainObject(parsed.data)) {
    return { ok: false, message: 'INVALID_FORMAT' };
  }
  const version = parsed.version === undefined ? 1 : parsed.version;
  if (typeof version !== 'number' || version > CURRENT_BACKUP_VERSION) {
    return { ok: false, message: 'INVALID_FORMAT' };
  }
  const data = parsed.data;
  if ('mesai.settings.v1' in data && !isValidSettings(data['mesai.settings.v1'])) {
    return { ok: false, message: 'INVALID_FORMAT' };
  }
  if ('mesai.entries.v1' in data && !isValidEntries(data['mesai.entries.v1'])) {
    return { ok: false, message: 'INVALID_FORMAT' };
  }

  // Owner check: compare the backup's profile email against the current
  // session email. If either side is empty (legacy backup, or no email
  // saved/logged in yet), skip the check entirely — never block. If both are
  // present and differ, don't write anything; let the caller ask the user
  // to confirm via confirmImportBackup().
  const backupSettings = data['mesai.settings.v1'];
  const backupEmail = isPlainObject(backupSettings) ? normalizeEmail(backupSettings.email) : '';
  const currentEmailRaw = await AsyncStorage.getItem('mesai.user.email.v1');
  const currentEmail = normalizeEmail(currentEmailRaw);
  if (backupEmail && currentEmail && backupEmail !== currentEmail) {
    return { ok: false, message: 'OWNER_MISMATCH', mismatch: { backupEmail, currentEmail, data } };
  }

  // All validation above is side-effect free. Only past this point do we write.
  return writeBackupData(data);
}

// Writes backup data that was already parsed/validated by a prior
// importBackup() call whose result was OWNER_MISMATCH, after the user has
// explicitly confirmed. Does not re-pick or re-read the file — it re-runs
// validation (via writeBackupData) but not the file/JSON/version checks,
// since those already passed to produce the mismatch result in the first place.
export async function confirmImportBackup(data: Record<string, unknown>): Promise<BackupImportResult> {
  return writeBackupData(data);
}
