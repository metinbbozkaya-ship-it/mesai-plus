export const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const TR_DAYS_LONG = [
  'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi',
];

export const EN_DAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export const TR_DAYS_SHORT = ['Pzr', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
export const EN_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function pad(n: number): string { return String(n ?? 0).padStart(2, '0'); }

export function toDateKey(d: Date): string {
  if (!d) return '';
  const y = d.getFullYear?.() ?? new Date().getFullYear();
  const m = pad((d.getMonth?.() ?? 0) + 1);
  const day = pad(d.getDate?.() ?? 1);
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  if (!key || typeof key !== 'string') return new Date();
  const parts = key.split('-');
  const y = parseInt(parts?.[0] ?? '1970', 10);
  const m = parseInt(parts?.[1] ?? '1', 10) - 1;
  const d = parseInt(parts?.[2] ?? '1', 10);
  return new Date(y, m, d);
}

export function formatDate(d: Date, language: 'tr' | 'en' = 'tr'): string {
  if (!d) return '';
  const day = d.getDate?.() ?? 1;
  const months = language === 'tr' ? TR_MONTHS : EN_MONTHS;
  const days = language === 'tr' ? TR_DAYS_LONG : EN_DAYS_LONG;
  const month = months?.[d.getMonth?.() ?? 0] ?? '';
  const year = d.getFullYear?.() ?? 0;
  const weekday = days?.[d.getDay?.() ?? 0] ?? '';
  return `${day} ${month} ${year}, ${weekday}`;
}

// Deprecated: Use formatDate() with language parameter instead
export function formatTurkishDate(d: Date): string {
  return formatDate(d, 'tr');
}

export function formatTurkishMonth(d: Date): string {
  if (!d) return '';
  return `${TR_MONTHS?.[d.getMonth?.() ?? 0] ?? ''} ${d.getFullYear?.() ?? 0}`;
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const last = new Date(year, month + 1, 0).getDate();
  const arr: Date[] = [];
  for (let i = 1; i <= last; i++) arr.push(new Date(year, month, i));
  return arr;
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}