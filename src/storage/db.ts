import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateEarnings, getDayType } from '../utils/salary';
import { fromDateKey } from '../utils/dates';

export interface WorkEntry {
  date: string; // YYYY-MM-DD
  hours: number;
  isAbsence: boolean;
  dayType: 'weekday' | 'saturday' | 'sunday' | 'holiday';
  multiplier: number;
  customMultiplier?: number; // user-selected custom multiplier (0.25 to 2.0)
  earnings: number;
  updatedAt: string;
  workplaceId?: string;
}

export interface Workplace {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: string;
}

export interface UserSettings {
  firstName: string;
  lastName: string;
  monthlySalaries: Record<string, number>; // Salary per month: { 'january': 5000, 'february': 5000, ... }
  email: string;
  updatedAt: string;
  notificationsEnabled?: boolean;
  notificationTime?: string; // HH:MM format
  startDate?: string; // YYYY-MM-DD - İşe başlama tarihi
  monthlyGoal?: number; // Aylık kazanç hedefi (TL)
  workplaces?: Workplace[];
  activeWorkplaceId?: string; // '' or undefined = show all
  // Informational only — not currently consumed by any salary/overtime
  // calculation (calculateHourlyRate uses a fixed STANDARD_MONTHLY_HOURS
  // constant). Collected at onboarding for future use.
  weeklyHours?: number;
}

const ENTRIES_KEY = 'mesai.entries.v1';
const SETTINGS_KEY = 'mesai.settings.v1';
const LANGUAGE_KEY = 'mesai.language.v1';
const THEME_KEY = 'mesai.theme.v1';
export const ONBOARDING_KEY = 'mesai.onboarding.done.v1';

async function safeGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch (e) {
    console.warn('[storage] get failed', key, e);
    return fallback;
  }
}

async function safeSet(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value ?? null));
  } catch (e) {
    console.warn('[storage] set failed', key, e);
  }
}

export async function loadEntries(): Promise<Record<string, WorkEntry>> {
  return await safeGet<Record<string, WorkEntry>>(ENTRIES_KEY, {});
}

export async function saveEntries(entries: Record<string, WorkEntry>): Promise<void> {
  await safeSet(ENTRIES_KEY, entries ?? {});
}

export async function upsertEntry(
  date: string,
  hours: number,
  isAbsence: boolean,
  hourlyRate: number = 1,
  customMultiplier?: number,
  workplaceId?: string
): Promise<WorkEntry> {
  const entries = await loadEntries();
  const d = fromDateKey(date);
  const dayType = getDayType(d);
  const { earnings, multiplier } = calculateEarnings(
    { hours, isAbsence, dayType },
    hourlyRate,
    customMultiplier
  );
  const entry: WorkEntry = {
    date,
    hours: Number(hours ?? 0) || 0,
    isAbsence: !!isAbsence,
    dayType,
    multiplier,
    ...(customMultiplier !== undefined ? { customMultiplier } : {}),
    ...(workplaceId ? { workplaceId } : {}),
    earnings,
    updatedAt: new Date().toISOString(),
  };
  const next = { ...(entries ?? {}), [date]: entry };
  await saveEntries(next);
  return entry;
}

export async function deleteEntry(date: string): Promise<void> {
  const entries = await loadEntries();
  const next = { ...(entries ?? {}) };
  delete next[date];
  await saveEntries(next);
}

export async function loadSettings(): Promise<UserSettings> {
  const defaultMonthly = {
    january: 0,
    february: 0,
    march: 0,
    april: 0,
    may: 0,
    june: 0,
    july: 0,
    august: 0,
    september: 0,
    october: 0,
    november: 0,
    december: 0,
  };
  return await safeGet<UserSettings>(SETTINGS_KEY, {
    firstName: '',
    lastName: '',
    monthlySalaries: defaultMonthly,
    email: '',
    updatedAt: '',
  });
}

export async function saveSettings(s: UserSettings): Promise<void> {
  await safeSet(SETTINGS_KEY, { ...(s ?? {}), updatedAt: new Date().toISOString() });
}

export async function loadLanguage(): Promise<'tr' | 'en'> {
  return await safeGet<'tr' | 'en'>(LANGUAGE_KEY, 'tr');
}

export async function saveLanguage(lang: 'tr' | 'en'): Promise<void> {
  await safeSet(LANGUAGE_KEY, lang);
}

export async function loadTheme(): Promise<'dark' | 'light' | 'system' | null> {
  return await safeGet<'dark' | 'light' | null>(THEME_KEY, null);
}

export async function saveTheme(theme: 'dark' | 'light' | 'system'): Promise<void> {
  await safeSet(THEME_KEY, theme);
}

export async function clearAllData(): Promise<void> {
  try {
    const keysToRemove = [
      ENTRIES_KEY,
      SETTINGS_KEY,
      'mesai.leave.usedDays.v1',
      'mesai.leave.usedDays.v2',
      'mesai.leave.startDate.v2',
      'mesai.leave.days.v2',
      // Cüzdan (finance) verileri — src/storage/finance.ts
      'mesai.receivables.v1',
      'mesai.advances.v1',
      'mesai.allowance.v1',
      'mesai.bills.v1',
      'mesai.expenses.v1',
      'mesai.savings.v1',
      'mesai.debts.v1',
      'mesai.assetPurchases.v1',
      // Widget'ın önbelleğe aldığı özet veri — src/widgets/widgetSync.tsx
      'mesai.widget.data.v1',
      // Kullanılmayan (dead route) çoklu-profil akışının bırakabileceği kalıntılar
      'mesai.user.email.v1',
      'mesai.google.idToken.v1',
      // So "Tüm Verileri Sıfırla" also re-shows onboarding on next launch.
      ONBOARDING_KEY,
    ];

    // Per-email backup snapshots (mesai.user.<email>.backup) use a dynamic
    // key name, so they can't be listed above — find and remove them too.
    const allKeys = await AsyncStorage.getAllKeys();
    const backupKeys = allKeys.filter((k) => k.startsWith('mesai.user.') && k.endsWith('.backup'));

    // Intentionally NOT cleared: mesai.language.v1, mesai.theme.v1,
    // mesai.palette.v1 (app preferences, not user records) and mesai.isPro.v1
    // (purchased entitlement cache — clearing it would falsely suggest the
    // user lost their paid Pro status; the store, not this key, is the source
    // of truth and it self-heals via ProContext's restore-on-mount).
    await AsyncStorage.multiRemove([...keysToRemove, ...backupKeys]);
  } catch (e) {
    console.warn('[storage] clearAllData failed', e);
  }
}

// ─── Per-user backup / restore ───────────────────────────────────
// When user logs out, we back up their data under their email key.
// When they log back in, we restore it.

function userKey(email: string, suffix: string): string {
  const normalized = email.trim().toLowerCase();
  return `mesai.user.${normalized}.${suffix}`;
}

export async function backupUserData(email: string): Promise<void> {
  try {
    const [entries, settings, leaveDays] = await Promise.all([
      AsyncStorage.getItem(ENTRIES_KEY),
      AsyncStorage.getItem(SETTINGS_KEY),
      AsyncStorage.getItem('mesai.leave.usedDays.v1'),
    ]);
    const backup: Record<string, string | null> = {
      entries,
      settings,
      leaveDays,
    };
    await AsyncStorage.setItem(userKey(email, 'backup'), JSON.stringify(backup));
  } catch (e) {
    console.warn('[storage] backupUserData failed', e);
  }
}

export async function restoreUserData(email: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(userKey(email, 'backup'));
    if (!raw) return false;
    const backup = JSON.parse(raw) as Record<string, string | null>;
    const ops: Promise<void>[] = [];
    if (backup.entries) ops.push(AsyncStorage.setItem(ENTRIES_KEY, backup.entries));
    if (backup.settings) ops.push(AsyncStorage.setItem(SETTINGS_KEY, backup.settings));
    if (backup.leaveDays) ops.push(AsyncStorage.setItem('mesai.leave.usedDays.v1', backup.leaveDays));
    await Promise.all(ops);
    return true;
  } catch (e) {
    console.warn('[storage] restoreUserData failed', e);
    return false;
  }
}
