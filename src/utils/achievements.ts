import type { WorkEntry } from '../storage/db';

export interface Achievement {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string; // Ionicons name
  color: string;
  target: number;
  progress: number;
  unlocked: boolean;
  category: 'streak' | 'earnings' | 'days' | 'variety' | 'consistency';
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastDate: string | null;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

export function computeStreak(entries: Record<string, WorkEntry>): StreakInfo {
  const workedDays = new Set<string>();
  for (const key of Object.keys(entries || {})) {
    const e = entries[key];
    if (!e || e.isAbsence) continue;
    if ((Number(e.hours) || 0) > 0) workedDays.add(key);
  }
  if (workedDays.size === 0) {
    return { current: 0, longest: 0, lastDate: null };
  }

  const sorted = Array.from(workedDays).sort();
  const lastDate = sorted[sorted.length - 1];

  // Longest streak
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak: count backwards from today (or last worked day if today missing but yesterday exists)
  const today = new Date();
  const todayKey = dateKey(today);
  let anchor: Date;
  if (workedDays.has(todayKey)) {
    anchor = today;
  } else {
    const yesterday = addDays(today, -1);
    if (workedDays.has(dateKey(yesterday))) {
      anchor = yesterday;
    } else {
      return { current: 0, longest, lastDate };
    }
  }

  let current = 0;
  let cursor = anchor;
  while (workedDays.has(dateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest, lastDate };
}

export function computeAchievements(entries: Record<string, WorkEntry>): Achievement[] {
  let totalEarnings = 0;
  let totalDays = 0;
  let totalHours = 0;
  const monthsWithData = new Set<string>();
  const dayTypesSet = new Set<string>();

  for (const key of Object.keys(entries || {})) {
    const e = entries[key];
    if (!e || e.isAbsence) continue;
    if ((Number(e.hours) || 0) > 0) {
      totalDays += 1;
      totalHours += Number(e.hours) || 0;
      totalEarnings += Number(e.earnings) || 0;
      monthsWithData.add(key.slice(0, 7));
      if (e.dayType) dayTypesSet.add(e.dayType);
    }
  }

  const streak = computeStreak(entries);

  const list: Achievement[] = [
    // Streak
    {
      id: 'streak_3',
      title: 'Başlangıç',
      titleEn: 'Kickstart',
      description: '3 gün üst üste çalış',
      descriptionEn: 'Work 3 days in a row',
      icon: 'flash-outline',
      color: '#F59E0B',
      target: 3,
      progress: Math.min(streak.longest, 3),
      unlocked: streak.longest >= 3,
      category: 'streak',
    },
    {
      id: 'streak_7',
      title: 'Haftalık Kahraman',
      titleEn: 'Weekly Hero',
      description: '7 gün üst üste çalış',
      descriptionEn: 'Work 7 days in a row',
      icon: 'flash',
      color: '#F97316',
      target: 7,
      progress: Math.min(streak.longest, 7),
      unlocked: streak.longest >= 7,
      category: 'streak',
    },
    {
      id: 'streak_30',
      title: 'Ayın Adamı',
      titleEn: 'Iron Month',
      description: '30 gün üst üste çalış',
      descriptionEn: 'Work 30 days in a row',
      icon: 'flame',
      color: '#EF4444',
      target: 30,
      progress: Math.min(streak.longest, 30),
      unlocked: streak.longest >= 30,
      category: 'streak',
    },

    // Earnings
    {
      id: 'earn_10k',
      title: 'İlk ₺10.000',
      titleEn: 'First ₺10,000',
      description: 'Toplam ₺10.000 kazanca ulaş',
      descriptionEn: 'Reach ₺10,000 total earnings',
      icon: 'cash-outline',
      color: '#22C55E',
      target: 10000,
      progress: Math.min(totalEarnings, 10000),
      unlocked: totalEarnings >= 10000,
      category: 'earnings',
    },
    {
      id: 'earn_50k',
      title: '₺50.000 Kulübü',
      titleEn: '₺50K Club',
      description: 'Toplam ₺50.000 kazanca ulaş',
      descriptionEn: 'Reach ₺50,000 total earnings',
      icon: 'cash',
      color: '#10B981',
      target: 50000,
      progress: Math.min(totalEarnings, 50000),
      unlocked: totalEarnings >= 50000,
      category: 'earnings',
    },
    {
      id: 'earn_100k',
      title: 'Altı Rakam',
      titleEn: 'Six Figures',
      description: 'Toplam ₺100.000 kazanca ulaş',
      descriptionEn: 'Reach ₺100,000 total earnings',
      icon: 'diamond',
      color: '#22D3EE',
      target: 100000,
      progress: Math.min(totalEarnings, 100000),
      unlocked: totalEarnings >= 100000,
      category: 'earnings',
    },
    {
      id: 'earn_500k',
      title: 'Şampiyon',
      titleEn: 'Champion',
      description: 'Toplam ₺500.000 kazanca ulaş',
      descriptionEn: 'Reach ₺500,000 total earnings',
      icon: 'trophy',
      color: '#F59E0B',
      target: 500000,
      progress: Math.min(totalEarnings, 500000),
      unlocked: totalEarnings >= 500000,
      category: 'earnings',
    },

    // Days
    {
      id: 'days_10',
      title: 'İlk Adım',
      titleEn: 'First Steps',
      description: '10 gün çalışma kaydet',
      descriptionEn: 'Record 10 work days',
      icon: 'checkmark-circle-outline',
      color: '#8B5CF6',
      target: 10,
      progress: Math.min(totalDays, 10),
      unlocked: totalDays >= 10,
      category: 'days',
    },
    {
      id: 'days_50',
      title: 'Deneyimli',
      titleEn: 'Experienced',
      description: '50 gün çalışma kaydet',
      descriptionEn: 'Record 50 work days',
      icon: 'ribbon',
      color: '#8B5CF6',
      target: 50,
      progress: Math.min(totalDays, 50),
      unlocked: totalDays >= 50,
      category: 'days',
    },
    {
      id: 'days_100',
      title: 'Yüzlerce Gün',
      titleEn: 'Century',
      description: '100 gün çalışma kaydet',
      descriptionEn: 'Record 100 work days',
      icon: 'medal',
      color: '#EC4899',
      target: 100,
      progress: Math.min(totalDays, 100),
      unlocked: totalDays >= 100,
      category: 'days',
    },
    {
      id: 'days_365',
      title: 'Bir Yıl',
      titleEn: 'Full Year',
      description: '365 gün çalışma kaydet',
      descriptionEn: 'Record 365 work days',
      icon: 'calendar',
      color: '#8B5CF6',
      target: 365,
      progress: Math.min(totalDays, 365),
      unlocked: totalDays >= 365,
      category: 'days',
    },

    // Variety
    {
      id: 'variety_all',
      title: 'Her Türlü Gün',
      titleEn: 'All Day Types',
      description: 'Hafta içi, C.tesi, Pazar ve Tatil gününde çalış',
      descriptionEn: 'Work on weekday, Saturday, Sunday and holiday',
      icon: 'infinite',
      color: '#22D3EE',
      target: 4,
      progress: dayTypesSet.size,
      unlocked: dayTypesSet.size >= 4,
      category: 'variety',
    },

    // Consistency
    {
      id: 'consistent_3m',
      title: '3 Ay Üst Üste',
      titleEn: '3 Months Active',
      description: '3 farklı ayda çalışma kaydet',
      descriptionEn: 'Log work across 3 different months',
      icon: 'trending-up',
      color: '#22C55E',
      target: 3,
      progress: Math.min(monthsWithData.size, 3),
      unlocked: monthsWithData.size >= 3,
      category: 'consistency',
    },
    {
      id: 'consistent_12m',
      title: 'Yıllık Sadık',
      titleEn: 'Yearly Loyal',
      description: '12 farklı ayda çalışma kaydet',
      descriptionEn: 'Log work across 12 different months',
      icon: 'star',
      color: '#F59E0B',
      target: 12,
      progress: Math.min(monthsWithData.size, 12),
      unlocked: monthsWithData.size >= 12,
      category: 'consistency',
    },
  ];

  return list;
}
