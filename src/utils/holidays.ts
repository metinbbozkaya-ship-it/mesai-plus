// Turkish fixed public holidays (month-day) - same every year
export const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': 'Yılbaşı',
  '04-23': 'Ulusal Egemenlik ve Çocuk Bayramı',
  '05-01': 'Emek ve Dayanışma Günü',
  '05-19': 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı',
  '07-15': 'Demokrasi ve Millî Birlik Günü',
  '08-30': 'Zafer Bayramı',
  '10-29': 'Cumhuriyet Bayramı',
};

// Islamic holidays (Dini Bayramlar) by year
// Ramazan Bayramı (Şeker Bayramı / Eid al-Fitr) - 3 days + Arefe (half day)
// Kurban Bayramı (Eid al-Adha) - 4 days + Arefe (half day)
// Dates based on Islamic calendar, sourced from Diyanet İşleri Başkanlığı

export const ISLAMIC_HOLIDAYS_2024: Record<string, string> = {
  // Ramazan Bayramı 2024: 9-12 Nisan
  '04-09': 'Ramazan Bayramı Arefesi',
  '04-10': 'Ramazan Bayramı',
  '04-11': 'Ramazan Bayramı',
  '04-12': 'Ramazan Bayramı',
  // Kurban Bayramı 2024: 15-19 Haziran
  '06-15': 'Kurban Bayramı Arefesi',
  '06-16': 'Kurban Bayramı',
  '06-17': 'Kurban Bayramı',
  '06-18': 'Kurban Bayramı',
  '06-19': 'Kurban Bayramı',
};

export const ISLAMIC_HOLIDAYS_2025: Record<string, string> = {
  // Ramazan Bayramı 2025: 29 Mart - 1 Nisan
  '03-29': 'Ramazan Bayramı Arefesi',
  '03-30': 'Ramazan Bayramı',
  '03-31': 'Ramazan Bayramı',
  '04-01': 'Ramazan Bayramı',
  // Kurban Bayramı 2025: 5-9 Haziran
  '06-05': 'Kurban Bayramı Arefesi',
  '06-06': 'Kurban Bayramı',
  '06-07': 'Kurban Bayramı',
  '06-08': 'Kurban Bayramı',
  '06-09': 'Kurban Bayramı',
};

export const ISLAMIC_HOLIDAYS_2026: Record<string, string> = {
  // Ramazan Bayramı 2026: 19-22 Mart
  '03-19': 'Ramazan Bayramı Arefesi',
  '03-20': 'Ramazan Bayramı',
  '03-21': 'Ramazan Bayramı',
  '03-22': 'Ramazan Bayramı',
  // Kurban Bayramı 2026: 26-30 Mayıs
  '05-26': 'Kurban Bayramı Arefesi',
  '05-27': 'Kurban Bayramı',
  '05-28': 'Kurban Bayramı',
  '05-29': 'Kurban Bayramı',
  '05-30': 'Kurban Bayramı',
};

export const ISLAMIC_HOLIDAYS_2027: Record<string, string> = {
  // Ramazan Bayramı 2027: 8-11 Mart
  '03-08': 'Ramazan Bayramı Arefesi',
  '03-09': 'Ramazan Bayramı',
  '03-10': 'Ramazan Bayramı',
  '03-11': 'Ramazan Bayramı',
  // Kurban Bayramı 2027: 15-19 Mayıs
  '05-15': 'Kurban Bayramı Arefesi',
  '05-16': 'Kurban Bayramı',
  '05-17': 'Kurban Bayramı',
  '05-18': 'Kurban Bayramı',
  '05-19': 'Kurban Bayramı',
};

export const ISLAMIC_HOLIDAYS_2028: Record<string, string> = {
  // Ramazan Bayramı 2028: 25-28 Şubat
  '02-25': 'Ramazan Bayramı Arefesi',
  '02-26': 'Ramazan Bayramı',
  '02-27': 'Ramazan Bayramı',
  '02-28': 'Ramazan Bayramı',
  // Kurban Bayramı 2028: 4-8 Mayıs
  '05-04': 'Kurban Bayramı Arefesi',
  '05-05': 'Kurban Bayramı',
  '05-06': 'Kurban Bayramı',
  '05-07': 'Kurban Bayramı',
  '05-08': 'Kurban Bayramı',
};

export const ISLAMIC_HOLIDAYS_2029: Record<string, string> = {
  // Ramazan Bayramı 2029: 13-16 Şubat
  '02-13': 'Ramazan Bayramı Arefesi',
  '02-14': 'Ramazan Bayramı',
  '02-15': 'Ramazan Bayramı',
  '02-16': 'Ramazan Bayramı',
  // Kurban Bayramı 2029: 23-27 Nisan
  '04-23': 'Kurban Bayramı Arefesi',
  '04-24': 'Kurban Bayramı',
  '04-25': 'Kurban Bayramı',
  '04-26': 'Kurban Bayramı',
  '04-27': 'Kurban Bayramı',
};

export const ISLAMIC_HOLIDAYS_2030: Record<string, string> = {
  // Ramazan Bayramı 2030: 3-6 Şubat
  '02-03': 'Ramazan Bayramı Arefesi',
  '02-04': 'Ramazan Bayramı',
  '02-05': 'Ramazan Bayramı',
  '02-06': 'Ramazan Bayramı',
  // Kurban Bayramı 2030: 12-16 Nisan
  '04-12': 'Kurban Bayramı Arefesi',
  '04-13': 'Kurban Bayramı',
  '04-14': 'Kurban Bayramı',
  '04-15': 'Kurban Bayramı',
  '04-16': 'Kurban Bayramı',
};

export const ISLAMIC_HOLIDAYS_2031: Record<string, string> = {
  // Ramazan Bayramı 2031: 23-26 Ocak (beklenen tarihler)
  '01-23': 'Ramazan Bayramı Arefesi',
  '01-24': 'Ramazan Bayramı',
  '01-25': 'Ramazan Bayramı',
  '01-26': 'Ramazan Bayramı',
  // Kurban Bayramı 2031: 2-6 Nisan (beklenen tarihler)
  '04-02': 'Kurban Bayramı Arefesi',
  '04-03': 'Kurban Bayramı',
  '04-04': 'Kurban Bayramı',
  '04-05': 'Kurban Bayramı',
  '04-06': 'Kurban Bayramı',
};

export function isPublicHoliday(date: Date): { isHoliday: boolean; name?: string } {
  if (!date) return { isHoliday: false };
  const mm = String((date.getMonth() ?? 0) + 1).padStart(2, '0');
  const dd = String(date.getDate() ?? 1).padStart(2, '0');
  const key = `${mm}-${dd}`;
  const year = date.getFullYear();
  
  // Check fixed holidays first (same every year)
  let name = FIXED_HOLIDAYS?.[key];
  if (name) return { isHoliday: true, name };
  
  // Check Islamic holidays by year
  let islamicHolidays: Record<string, string> | undefined;
  
  switch (year) {
    case 2024:
      islamicHolidays = ISLAMIC_HOLIDAYS_2024;
      break;
    case 2025:
      islamicHolidays = ISLAMIC_HOLIDAYS_2025;
      break;
    case 2026:
      islamicHolidays = ISLAMIC_HOLIDAYS_2026;
      break;
    case 2027:
      islamicHolidays = ISLAMIC_HOLIDAYS_2027;
      break;
    case 2028:
      islamicHolidays = ISLAMIC_HOLIDAYS_2028;
      break;
    case 2029:
      islamicHolidays = ISLAMIC_HOLIDAYS_2029;
      break;
    case 2030:
      islamicHolidays = ISLAMIC_HOLIDAYS_2030;
      break;
    case 2031:
      islamicHolidays = ISLAMIC_HOLIDAYS_2031;
      break;
    default:
      islamicHolidays = undefined;
  }
  
  if (islamicHolidays) {
    name = islamicHolidays?.[key];
    if (name) return { isHoliday: true, name };
  }
  
  return { isHoliday: false };
}
