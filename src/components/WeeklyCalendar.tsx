import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getColors, radius, spacing } from '../theme';
import { formatTL, getDayType, getMultiplier, DayType } from '../utils/salary';
import type { WorkEntry } from '../storage/db';

interface Props {
  entries: Record<string, WorkEntry>;
  theme: 'dark' | 'light';
  language: 'tr' | 'en';
}

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  const dow = nd.getDay(); // 0 = Sun
  const diff = dow === 0 ? -6 : 1 - dow; // shift to Monday
  nd.setDate(nd.getDate() + diff);
  return nd;
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

export function WeeklyCalendar({ entries, theme, language }: Props) {
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const router = useRouter();

  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const todayKey = dateKey(new Date());

  const days = useMemo(() => {
    const arr: Array<{ date: Date; key: string; entry: WorkEntry | undefined; isToday: boolean; dayType: DayType; }> = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const key = dateKey(d);
      const entry = entries[key];
      arr.push({
        date: d,
        key,
        entry,
        isToday: key === todayKey,
        dayType: getDayType(d),
      });
    }
    return arr;
  }, [weekStart, entries, todayKey]);

  const weekTotals = useMemo(() => {
    let hours = 0;
    let earnings = 0;
    let daysWorked = 0;
    for (const d of days) {
      const e = d.entry;
      if (!e || e.isAbsence) continue;
      const h = Number(e.hours) || 0;
      hours += h;
      earnings += Number(e.earnings) || 0;
      if (h > 0) daysWorked += 1;
    }
    return { hours, earnings, daysWorked };
  }, [days]);

  const weekLabel = useMemo(() => {
    const monthsShort = language === 'tr' ? MONTHS_TR : MONTHS_EN;
    const s = weekStart;
    const e = weekEnd;
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()}–${e.getDate()} ${monthsShort[s.getMonth()]}`;
    }
    return `${s.getDate()} ${monthsShort[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${monthsShort[e.getMonth()].slice(0, 3)}`;
  }, [weekStart, weekEnd, language]);

  const openDay = useCallback((key: string) => {
    router.push({ pathname: '/entry', params: { date: key } });
  }, [router]);

  const dayLabels = language === 'tr' ? DAYS_TR : DAYS_EN;

  return (
    <View style={{ marginTop: spacing.sm }}>
      {/* Week navigation */}
      <View style={styles.navRow}>
        <Pressable
          onPress={() => setWeekOffset((o) => o - 1)}
          hitSlop={12}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          {weekOffset !== 0 && (
            <Pressable onPress={() => setWeekOffset(0)} hitSlop={8}>
              <Text style={styles.todayJump}>
                {language === 'tr' ? 'Bu haftaya dön' : 'Jump to this week'}
              </Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setWeekOffset((o) => o + 1)}
          hitSlop={12}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>

      {/* Summary strip */}
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summary}
      >
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatTL(weekTotals.earnings)}</Text>
          <Text style={styles.summaryLabel}>
            {language === 'tr' ? 'Kazanç' : 'Earnings'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{weekTotals.hours.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>
            {language === 'tr' ? 'Saat' : 'Hours'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{weekTotals.daysWorked}/7</Text>
          <Text style={styles.summaryLabel}>
            {language === 'tr' ? 'Gün' : 'Days'}
          </Text>
        </View>
      </LinearGradient>

      {/* Day rows */}
      <View style={{ gap: 6, marginTop: spacing.sm }}>
        {days.map((d, i) => {
          const e = d.entry;
          const hasWork = e && !e.isAbsence && (Number(e.hours) || 0) > 0;
          const isAbsent = e?.isAbsence;
          const isWeekend = d.dayType === 'saturday' || d.dayType === 'sunday';
          const isHoliday = d.dayType === 'holiday';
          const dayColor = isHoliday ? colors.danger : isWeekend ? '#F59E0B' : colors.textMuted;
          const mult = getMultiplier(d.dayType);

          return (
            <Pressable
              key={d.key}
              onPress={() => openDay(d.key)}
              style={({ pressed }) => [
                styles.dayRow,
                d.isToday && { borderColor: colors.accent, borderWidth: 1.5 },
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={styles.dayLeft}>
                <Text style={[styles.dayName, { color: dayColor }]}>
                  {dayLabels[i]}
                </Text>
                <Text
                  style={[
                    styles.dayNum,
                    { color: d.isToday ? colors.accent : colors.text },
                  ]}
                >
                  {d.date.getDate()}
                </Text>
                {mult > 1 && (
                  <View
                    style={[
                      styles.multBadge,
                      { backgroundColor: (isHoliday ? colors.danger : isWeekend ? '#F59E0B' : colors.primary) + '22' },
                    ]}
                  >
                    <Text style={[styles.multText, { color: isHoliday ? colors.danger : isWeekend ? '#F59E0B' : colors.primary }]}>
                      ×{mult}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.dayMid}>
                {hasWork ? (
                  <>
                    <Text style={styles.dayHours}>
                      {(Number(e!.hours) || 0).toFixed(1)} {language === 'tr' ? 'sa' : 'h'}
                    </Text>
                    <Text style={styles.dayEarn}>{formatTL(Number(e!.earnings) || 0)}</Text>
                  </>
                ) : isAbsent ? (
                  <Text style={styles.dayAbsent}>
                    {language === 'tr' ? 'İzin' : 'Absent'}
                  </Text>
                ) : (
                  <Text style={styles.dayEmpty}>
                    {language === 'tr' ? 'Giriş yok' : 'No entry'}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.dayDot,
                  {
                    backgroundColor: hasWork
                      ? colors.success
                      : isAbsent
                      ? colors.danger
                      : colors.border,
                  },
                ]}
              />
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekLabel: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    todayJump: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },
    summaryValue: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '800',
    },
    summaryLabel: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginTop: 2,
    },
    summaryDivider: {
      width: 1,
      height: 30,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.sm + 2,
    },
    dayLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: 90,
    },
    dayName: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      width: 28,
    },
    dayNum: {
      fontSize: 20,
      fontWeight: '800',
      width: 28,
    },
    multBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    multText: {
      fontSize: 10,
      fontWeight: '700',
    },
    dayMid: {
      flex: 1,
      alignItems: 'flex-end',
    },
    dayHours: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    dayEarn: {
      color: colors.success,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 1,
    },
    dayAbsent: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    dayEmpty: {
      color: colors.textMuted,
      fontSize: 12,
    },
    dayDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });
