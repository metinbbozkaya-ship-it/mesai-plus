import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getColors, radius, spacing } from '../theme';
import { t } from '../utils/i18n';
import { useApp } from '../context/AppContext';
import { formatTurkishMonth } from '../utils/dates';
import { formatTL } from '../utils/salary';
import { DayBadge } from './DayBadge';
import { FadeInView } from './FadeInView';

interface MonthDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  month: { year: number; month: number } | null;
}

export function MonthDetailsModal({ visible, onClose, month }: MonthDetailsModalProps) {
  const { theme, language, entries } = useApp();
  const colors = getColors(theme);
  const styles = getStyles(colors);

  const monthDetails = useMemo(() => {
    if (!month) return { days: [], totalHours: 0, totalEarned: 0 };

    const all = Object.values(entries ?? {});
    const monthEntries = all.filter(e => {
      if (!e?.date) return false;
      const parts = e.date.split('-');
      return (
        parseInt(parts?.[0] ?? '0', 10) === month.year &&
        parseInt(parts?.[1] ?? '0', 10) - 1 === month.month
      );
    });

    let totalHours = 0;
    let totalEarned = 0;

    const days = monthEntries
      .map(e => ({
        date: e.date,
        day: new Date(e.date + 'T00:00:00').getDate(),
        hours: Number(e?.hours ?? 0) || 0,
        earnings: Number(e?.earnings ?? 0) || 0,
        isAbsence: e?.isAbsence ?? false,
        dayType: e?.dayType,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    days.forEach(day => {
      totalHours += day.hours;
      totalEarned += day.earnings;
    });

    return { days, totalHours, totalEarned };
  }, [month, entries]);

  if (!month) return null;

  const monthDate = new Date(month.year, month.month, 1);
  const monthName = formatTurkishMonth(monthDate);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>{monthName}</Text>
            <View style={{ width: 28 }} />
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{language === 'tr' ? 'Toplam Saat' : 'Total Hours'}</Text>
              <Text style={styles.statValue}>{monthDetails.totalHours.toFixed(1)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{language === 'tr' ? 'Kazanç' : 'Earnings'}</Text>
              <Text style={[styles.statValue, { color: monthDetails.totalEarned >= 0 ? '#10b981' : '#ef4444' }]}>
                {monthDetails.totalEarned > 0 ? '+' : ''}{formatTL(monthDetails.totalEarned)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView style={[styles.content, { backgroundColor: colors.bg }]} contentContainerStyle={styles.contentInner}>
          {monthDetails.days.length === 0 ? (
            <Text style={styles.emptyText}>{language === 'tr' ? 'Bu ay için giriş yok' : 'No entries for this month'}</Text>
          ) : (
            monthDetails.days.map((day, idx) => (
              <FadeInView key={idx} delay={idx * 40}>
              <View style={[styles.dayItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.dayLeft}>
                  <View style={styles.dayDateBox}>
                    <Text style={styles.dayNumber}>{day.day}</Text>
                    <Text style={styles.dayDayName}>
                      {new Date(day.date + 'T00:00:00').toLocaleDateString(
                        language === 'tr' ? 'tr-TR' : 'en-US',
                        { weekday: 'short' }
                      )}
                    </Text>
                  </View>
                  <View style={styles.dayInfo}>
                    <Text style={styles.dayHours}>
                      {day.isAbsence ? t(language, 'absence') : `${day.hours.toFixed(1)} ${language === 'tr' ? 'sa' : 'h'}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.dayRight}>
                  <DayBadge dayType={day.dayType} />
                  <Text
                    style={[
                      styles.dayEarnings,
                      day.earnings < 0 ? styles.dayEarningsNegative : styles.dayEarningsPositive,
                    ]}
                  >
                    {day.earnings > 0 ? '+' : ''}{formatTL(day.earnings)}
                  </Text>
                </View>
              </View>
              </FadeInView>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function getStyles(colors: typeof import('../theme').darkColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    closeButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '800',
      flex: 1,
      textAlign: 'center',
    },
    headerStats: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    statBox: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
    },
    statLabel: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    statValue: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '800',
    },
    content: {
      flex: 1,
    },
    contentInner: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    emptyText: {
      color: colors.textMuted,
      textAlign: 'center',
      fontSize: 14,
      marginTop: spacing.xl,
    },
    dayItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
    },
    dayLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    dayDateBox: {
      width: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNumber: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    dayDayName: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
    dayInfo: {
      flex: 1,
    },
    dayHours: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    dayRight: {
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
    dayEarnings: {
      fontSize: 14,
      fontWeight: '800',
    },
    dayEarningsPositive: {
      color: '#10b981',
    },
    dayEarningsNegative: {
      color: '#ef4444',
    },
  });
}
