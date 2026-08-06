import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';
import { WorkEntry } from '../storage/db';

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const APP_NAME = 'Mesai+';

interface ReportData {
  monthName: string;
  monthIndex: number;
  salary: number;
  hourlyRate: number;
  entries: WorkEntry[];
  year: number;
  firstName: string;
  lastName: string;
  email: string;
}

export const generateReportData = (
  monthIndex: number,
  entries: Record<string, WorkEntry>,
  monthlySalaries: Record<string, number>,
  language: 'tr' | 'en',
  firstName: string = '',
  lastName: string = '',
  email: string = ''
): ReportData => {
  const monthKey = MONTH_KEYS[monthIndex];
  const monthName = language === 'tr' ? MONTHS_TR[monthIndex] : MONTHS_EN[monthIndex];
  
  const entriesArray = Object.values(entries || {});
  const now = new Date();
  const year = now.getFullYear();
  
  const monthEntries = entriesArray.filter((entry: any) => {
    if (!entry?.date) return false;
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() === monthIndex && entryDate.getFullYear() === year;
  });

  const salary = monthlySalaries?.[monthKey] || 0;
  const hourlyRate = salary / 225;

  return {
    monthName,
    monthIndex,
    salary,
    hourlyRate,
    entries: monthEntries.sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    }),
    year,
    firstName,
    lastName,
    email,
  };
};

const generatePdfHtml = (
  data: ReportData,
  language: 'tr' | 'en'
): string => {
  const isTr = language === 'tr';
  let totalEarnings = 0;
  const fullName = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || (isTr ? '— ' : '—');
  const generatedOn = new Date().toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const reportNo = `MS-${data.year}${String(data.monthIndex + 1).padStart(2, '0')}-${Date.now().toString().slice(-5)}`;

  const dayTypeLabel = (t: string) => {
    if (isTr) {
      switch (t) {
        case 'weekday': return 'Hafta İçi';
        case 'saturday': return 'Cumartesi';
        case 'sunday': return 'Pazar';
        case 'holiday': return 'Resmi Tatil';
        default: return t;
      }
    }
    switch (t) {
      case 'weekday': return 'Weekday';
      case 'saturday': return 'Saturday';
      case 'sunday': return 'Sunday';
      case 'holiday': return 'Holiday';
      default: return t;
    }
  };

  let totalHours = 0;
  const tableRows = data.entries.map((entry: any) => {
    const date = new Date(entry.date);
    const dateStr = date.toLocaleDateString(isTr ? 'tr-TR' : 'en-US');
    const hours = Number(entry.hours) || 0;
    const multiplier = Number(entry.multiplier) || 1.0;
    const earnings = Number(entry.earnings) || hours * data.hourlyRate * multiplier;
    const isAbsence = !!entry.isAbsence;
    totalEarnings += earnings;
    totalHours += hours;

    const dayName = date.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { weekday: 'short' });
    return `
      <tr${isAbsence ? ' class="absence"' : ''}>
        <td>${dateStr}</td>
        <td>${dayName}</td>
        <td class="num">${hours.toFixed(1)}</td>
        <td class="num">×${multiplier.toFixed(2)}</td>
        <td class="num">${data.hourlyRate.toFixed(2)} ₺</td>
        <td class="num strong">${earnings.toFixed(2)} ₺</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="${language === 'tr' ? 'tr' : 'en'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${APP_NAME} - ${data.monthName} ${data.year}</title>
      <style>
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

        .info-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 6px; margin-bottom: 10px;
        }
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
        tbody tr.absence td { color: #b91c1c; font-style: italic; }
        td.strong { font-weight: 800; color: #0f172a; }
        .empty-row td {
          text-align: center; color: #9ca3af; padding: 18px; font-style: italic;
        }

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
        .summary-row {
          background: #eff6ff;
          border: 1px solid #1D4ED8;
          border-radius: 4px;
          padding: 5px 10px;
          margin-bottom: 4px;
          display: flex; justify-content: space-between;
          font-size: 10px; font-weight: 700; color: #1D4ED8;
        }
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
      </style>
    </head>
    <body>
      <div class="official-title">
        <div class="h1">${isTr ? 'MESAİ+ AYLIK ÇALIŞMA RAPORU' : 'MESAİ+ MONTHLY WORK REPORT'}</div>
        <div class="h2">${isTr ? 'Resmî Mesai Çizelgesi' : 'Official Overtime Schedule'}</div>
      </div>
      <div class="doc-header">
        <div class="brand">
          <div class="name">${APP_NAME}</div>
          <div class="tagline">${isTr ? 'Rapor No' : 'Report No'}: ${reportNo} • ${isTr ? 'Düzenlenme' : 'Issued'}: ${generatedOn}</div>
        </div>
        <div class="doc-meta">
          <div><span class="label">${isTr ? 'Ad Soyad' : 'Full Name'}</span></div>
          <div class="value" style="font-size:11px;">${fullName}</div>
          <div style="margin-top:4px;"><span class="label">${isTr ? 'Rapor Dönemi' : 'Period'}</span></div>
          <div class="value" style="font-size:11px;">${data.monthName} ${data.year}</div>
        </div>
      </div>

      <h2 class="section-title">${isTr ? 'Personel Bilgileri' : 'Employee Information'}</h2>
      <div class="info-grid">
        <div class="info-block">
          <div class="label">${isTr ? 'Ad Soyad' : 'Full Name'}</div>
          <div class="value">${fullName}</div>
        </div>
        <div class="info-block">
          <div class="label">${isTr ? 'E-Posta' : 'Email'}</div>
          <div class="value">${data.email || '—'}</div>
        </div>
        <div class="info-block">
          <div class="label">${isTr ? 'Aylık Net Maaş' : 'Monthly Net Salary'}</div>
          <div class="value">${data.salary.toFixed(2)} ₺</div>
        </div>
        <div class="info-block">
          <div class="label">${isTr ? 'Saatlik Ücret' : 'Hourly Rate'}</div>
          <div class="value">${data.hourlyRate.toFixed(2)} ₺</div>
        </div>
      </div>

      <h2 class="section-title">${isTr ? 'Günlük Mesai Dökümü' : 'Daily Work Breakdown'}</h2>
      <table>
        <thead>
          <tr>
            <th>${isTr ? 'Tarih' : 'Date'}</th>
            <th>${isTr ? 'Gün' : 'Day'}</th>
            <th class="num">${isTr ? 'Saat' : 'Hours'}</th>
            <th class="num">${isTr ? 'Mesai Oranı' : 'Rate'}</th>
            <th class="num">${isTr ? 'Saat Ücreti' : 'Hourly'}</th>
            <th class="num">${isTr ? 'Hakedilen' : 'Earned'}</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr class="empty-row"><td colspan="6">${isTr ? 'Bu döneme ait mesai kaydı bulunmamaktadır.' : 'No work entries for this period.'}</td></tr>`}
        </tbody>
      </table>

      <div class="summary-row">
        <span>${isTr ? 'TOPLAM MESAİ SAATİ' : 'TOTAL OVERTIME HOURS'}: ${totalHours.toFixed(1)} ${isTr ? 'saat' : 'h'}</span>
        <span>${isTr ? 'TOPLAM HAKEDİŞ' : 'TOTAL EARNINGS'}: ${totalEarnings.toFixed(2)} ₺</span>
      </div>
      <div class="totals">
        <div class="row"><span class="label">${isTr ? 'Çalışılan Gün' : 'Work Days'}</span><span class="value">${data.entries.length}</span></div>
        <div class="row"><span class="label">${isTr ? 'Toplam Saat' : 'Total Hours'}</span><span class="value">${totalHours.toFixed(1)}</span></div>
        <div class="row grand"><span class="label">${isTr ? 'TOPLAM HAKEDİŞ' : 'TOTAL EARNED'}</span><span class="value">${totalEarnings.toFixed(2)} ₺</span></div>
      </div>

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
        <div>${isTr ? 'Bu rapor ' + APP_NAME + ' uygulaması tarafından otomatik olarak oluşturulmuştur.' : 'This report was automatically generated by ' + APP_NAME + '.'}</div>
        <div>${isTr ? 'Veriler uçtan uca şifrelenmiş olarak yalnızca cihazınızda saklanır.' : 'Data is end-to-end encrypted and stored only on your device.'}</div>
      </div>
    </body>
    </html>
  `;
};

export const sharePdfReport = async (
  data: ReportData,
  language: 'tr' | 'en'
): Promise<void> => {
  const html = generatePdfHtml(data, language);
  
  // Use expo-print to generate a real PDF from HTML
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Move to a proper filename
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Mesai+_${data.monthName}_${timestamp}.pdf`;
  const newPath = `${FileSystem.documentDirectory}${fileName}`;
  
  await FileSystem.moveAsync({ from: uri, to: newPath });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(newPath, {
      mimeType: 'application/pdf',
      dialogTitle: language === 'tr' ? 'Raporu Paylaş' : 'Share Report',
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing not available');
  }
};

export const sendPdfByEmail = async (
  data: ReportData,
  language: 'tr' | 'en'
): Promise<void> => {
  if (!data.email) {
    throw new Error(language === 'tr' ? 'E-posta adresi bulunamadı' : 'Email address not found');
  }

  const html = generatePdfHtml(data, language);
  
  // Use expo-print to generate a real PDF from HTML
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Move to a proper filename
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Mesai+_${data.monthName}_${timestamp}.pdf`;
  const newPath = `${FileSystem.documentDirectory}${fileName}`;
  
  await FileSystem.moveAsync({ from: uri, to: newPath });

  // Read PDF as base64
  const base64 = await FileSystem.readAsStringAsync(newPath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Check if mail is available
  const available = await MailComposer.isAvailableAsync();
  if (!available) {
    throw new Error(language === 'tr' ? 'Mail uygulaması kullanılamıyor' : 'Mail app not available');
  }

  // Send email with PDF attachment
  const subject = `${APP_NAME} - ${data.monthName} ${data.year} ${language === 'tr' ? 'Raporu' : 'Report'}`;
  const body = language === 'tr'
    ? `Sayın ${data.firstName} ${data.lastName},\n\nEkli dosya, ${data.monthName} ${data.year} ayına ait çalışma raporunuzdur.\n\nMesai+ Uygulaması`
    : `Dear ${data.firstName} ${data.lastName},\n\nPlease find attached your work report for ${data.monthName} ${data.year}.\n\nMesai+ Application`;

  await MailComposer.composeAsync({
    recipients: [data.email],
    subject,
    body,
    attachments: [newPath],
  });
};
