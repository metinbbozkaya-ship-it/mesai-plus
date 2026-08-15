import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { WorkEntry, UserSettings } from '../storage/db';

const WIDGET_DATA_KEY = 'mesai.widget.data.v1';

export interface WidgetData {
  monthEarnings: number;
  monthLabel: string;
  daysWorked: number;
  daysLeft: number;
  goal: number;
  goalPct: number;
}

const MONTHS_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export function computeWidgetData(
  entries: Record<string, WorkEntry>,
  settings: UserSettings
): WidgetData {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}-`;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = now.getDate();

  let monthEarnings = 0;
  let daysWorked = 0;
  for (const key of Object.keys(entries || {})) {
    if (!key.startsWith(prefix)) continue;
    const e = entries[key];
    if (!e || e.isAbsence) continue;
    monthEarnings += Number(e.earnings) || 0;
    if ((Number(e.hours) || 0) > 0) daysWorked += 1;
  }

  const daysLeft = Math.max(0, daysInMonth - today);
  const goal = Number(settings?.monthlyGoal || 0);
  const goalPct = goal > 0 ? (monthEarnings / goal) * 100 : 0;

  return {
    monthEarnings,
    monthLabel: `${MONTHS_TR[m]} ${y}`,
    daysWorked,
    daysLeft,
    goal,
    goalPct,
  };
}

export async function persistWidgetData(data: WidgetData): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[widget] persist failed', e);
  }
}

export async function loadWidgetData(): Promise<WidgetData> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as WidgetData;
    }
  } catch (e) {
    console.warn('[widget] load failed', e);
  }
  return {
    monthEarnings: 0,
    monthLabel: '',
    daysWorked: 0,
    daysLeft: 0,
    goal: 0,
    goalPct: 0,
  };
}

export async function syncMesaiWidget(
  entries: Record<string, WorkEntry>,
  settings: UserSettings
): Promise<void> {
  const data = computeWidgetData(entries, settings);
  await persistWidgetData(data);
  if (Platform.OS !== 'android') return;
  try {
    const { requestWidgetUpdate } = await import('react-native-android-widget');
    const { MesaiWidget } = await import('./MesaiWidget');
    await requestWidgetUpdate({
      widgetName: 'Mesai',
      renderWidget: () => <MesaiWidget {...data} />,
      widgetNotFound: () => {},
    });
  } catch (e) {
    console.warn('[widget] update failed', e);
  }
}
