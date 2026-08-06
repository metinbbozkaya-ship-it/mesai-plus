import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

const APP_NAME = 'Mesai+';

export interface CorporateMeta {
  reportTitle: string;       // e.g. "YILLIK MAAŞ RAPORU"
  reportSubtitle: string;    // e.g. "Yıllık Bordro Özeti"
  reportNo: string;          // e.g. "MS-AS-202604-12345"
  period: string;            // e.g. "2026 Yılı"
  fullName: string;
  email: string;
  netSalary?: number;        // Aylık Net Maaş (₺)
  language: 'tr' | 'en';
  fileName: string;          // e.g. "Mesai+_Yillik_Maas_2026.pdf"
}

export interface CorporateSection {
  title: string;
  /** Pre-rendered HTML for body (table or summary blocks). */
  body: string;
}

const CORPORATE_CSS = `
  @page { size: A4; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    padding: 0;
    color: #1f2937;
    font-size: 9.5px;
  }
  .official-title {
    text-align: center;
    padding: 6px 0 4px;
    border-top: 3px solid #1D4ED8;
    border-bottom: 1px solid #1D4ED8;
    margin-bottom: 8px;
  }
  .official-title .h1 {
    font-size: 15px; font-weight: 900; letter-spacing: 1.5px;
    color: #1D4ED8; text-transform: uppercase;
  }
  .official-title .h2 {
    font-size: 8.5px; color: #475569; letter-spacing: 0.8px;
    margin-top: 2px; text-transform: uppercase;
  }
  .doc-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding-bottom: 6px; margin-bottom: 8px;
  }
  .brand .name { font-size: 13px; font-weight: 800; color: #1D4ED8; letter-spacing: 0.4px; }
  .brand .tagline { font-size: 8.5px; color: #6b7280; margin-top: 2px; letter-spacing: 0.3px; }
  .doc-meta { text-align: right; font-size: 9px; color: #4b5563; line-height: 1.4; }
  .doc-meta .label { color: #9ca3af; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; }
  .doc-meta .value { font-weight: 700; color: #111827; font-size: 10px; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; margin-bottom: 10px; }
  .info-block {
    padding: 6px 8px; background: #f9fafb;
    border: 1px solid #e5e7eb; border-radius: 4px;
  }
  .info-block .label {
    font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 2px;
  }
  .info-block .value { font-size: 10.5px; font-weight: 700; color: #111827; }

  h2.section-title {
    font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.6px;
    color: #1D4ED8; margin-bottom: 4px; margin-top: 4px; font-weight: 800;
  }

  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #1D4ED8; }
  thead { background: #1D4ED8; color: #fff; }
  th {
    padding: 4px 6px; text-align: left; font-size: 8.5px;
    text-transform: uppercase; letter-spacing: 0.4px; font-weight: 800;
    border-right: 1px solid rgba(255,255,255,0.18);
  }
  th:last-child { border-right: none; }
  th.num, td.num { text-align: right; }
  th.center, td.center { text-align: center; }
  td { padding: 3px 6px; font-size: 9px; border-bottom: 1px solid #e5e7eb; }
  tbody tr:nth-child(even) { background: #f3f6fb; }
  tbody tr:nth-child(odd) { background: #ffffff; }
  tbody tr.total-row { background: #eff6ff; font-weight: 800; }
  tbody tr.total-row td { color: #1D4ED8; border-top: 2px solid #1D4ED8; }
  td.strong { font-weight: 800; color: #0f172a; }
  td.pos { color: #047857; font-weight: 700; }
  td.neg { color: #b91c1c; font-weight: 700; }
  .empty-row td { text-align: center; color: #9ca3af; padding: 18px; font-style: italic; }

  .totals {
    margin-top: 2px; margin-left: auto; width: 55%;
    border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;
  }
  .totals .row {
    display: flex; justify-content: space-between;
    padding: 4px 10px; font-size: 9.5px;
    border-bottom: 1px solid #f1f5f9;
  }
  .totals .row:last-child { border-bottom: none; }
  .totals .label { color: #6b7280; }
  .totals .value { font-weight: 700; color: #111827; }
  .totals .grand { background: #1D4ED8; color: #fff; }
  .totals .grand .label, .totals .grand .value {
    color: #fff; font-size: 11px; font-weight: 800;
  }

  .signature-area {
    margin-top: 18px; display: flex; justify-content: space-between; gap: 40px;
  }
  .signature-box { flex: 1; text-align: center; }
  .signature-line {
    border-top: 1px solid #6b7280; margin-bottom: 3px; height: 1px; margin-top: 18px;
  }
  .signature-label {
    font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.4px;
    color: #6b7280; font-weight: 700;
  }

  .footer {
    margin-top: 10px; padding-top: 6px; border-top: 1px solid #e5e7eb;
    text-align: center; font-size: 7.5px; color: #9ca3af; line-height: 1.4;
  }
`;

function tl(n: number): string {
  return (Number(n) || 0).toFixed(2) + ' ₺';
}

export function buildCorporateHtml(meta: CorporateMeta, sections: CorporateSection[]): string {
  const isTr = meta.language === 'tr';
  const issued = new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const netBlock = meta.netSalary !== undefined ? `
    <div class="info-block">
      <div class="label">${isTr ? 'Aylık Net Maaş' : 'Monthly Net Salary'}</div>
      <div class="value">${tl(meta.netSalary)}</div>
    </div>` : '';

  return `
    <!DOCTYPE html>
    <html lang="${meta.language}">
    <head>
      <meta charset="UTF-8">
      <title>${APP_NAME} - ${meta.reportTitle}</title>
      <style>${CORPORATE_CSS}</style>
    </head>
    <body>
      <div class="official-title">
        <div class="h1">${APP_NAME} ${meta.reportTitle}</div>
        <div class="h2">${meta.reportSubtitle}</div>
      </div>
      <div class="doc-header">
        <div class="brand">
          <div class="name">${APP_NAME}</div>
          <div class="tagline">${isTr ? 'Rapor No' : 'Report No'}: ${meta.reportNo} • ${isTr ? 'Düzenlenme' : 'Issued'}: ${issued}</div>
        </div>
        <div class="doc-meta">
          <div><span class="label">${isTr ? 'Ad Soyad' : 'Full Name'}</span></div>
          <div class="value" style="font-size:11px;">${meta.fullName || '—'}</div>
          <div style="margin-top:4px;"><span class="label">${isTr ? 'Rapor Dönemi' : 'Period'}</span></div>
          <div class="value" style="font-size:11px;">${meta.period}</div>
        </div>
      </div>

      <h2 class="section-title">${isTr ? 'Personel Bilgileri' : 'Employee Information'}</h2>
      <div class="info-grid">
        <div class="info-block">
          <div class="label">${isTr ? 'Ad Soyad' : 'Full Name'}</div>
          <div class="value">${meta.fullName || '—'}</div>
        </div>
        <div class="info-block">
          <div class="label">${isTr ? 'E-Posta' : 'Email'}</div>
          <div class="value">${meta.email || '—'}</div>
        </div>
        ${netBlock}
        <div class="info-block">
          <div class="label">${isTr ? 'Dönem' : 'Period'}</div>
          <div class="value">${meta.period}</div>
        </div>
      </div>

      ${sections.map(s => `
        <h2 class="section-title">${s.title}</h2>
        ${s.body}
      `).join('\n')}

      <div class="signature-area">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">${isTr ? 'Personel İmzası' : 'Employee Signature'}</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">${isTr ? 'Yetkili İmzası' : 'Authorized Signature'}</div>
        </div>
      </div>

      <div class="footer">
        <div>${isTr
          ? `Bu rapor ${APP_NAME} tarafından oluşturulmuştur. Veriler cihazınızda saklanır.`
          : `This report was generated by ${APP_NAME}. Data stays on your device.`}</div>
        <div>${isTr
          ? 'Hesaplamalar bilgilendirme amaçlıdır; resmi bordro işlemleri için muhasebe biriminize danışınız.'
          : 'Calculations are for informational purposes only; for official payroll consult your accounting department.'}</div>
      </div>
    </body>
    </html>
  `;
}

export async function shareCorporatePdf(html: string, fileName: string, language: 'tr' | 'en'): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const newPath = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: uri, to: newPath });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(newPath, {
      mimeType: 'application/pdf',
      dialogTitle: language === 'tr' ? 'Raporu Paylaş' : 'Share Report',
      UTI: 'com.adobe.pdf',
    });
  }
}

export function makeReportNo(prefix: string): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${prefix}-${ym}-${Date.now().toString().slice(-5)}`;
}

export const fmtTL = tl;
