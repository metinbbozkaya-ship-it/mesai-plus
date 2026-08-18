import React, { useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../../../src/context/AppContext';
import { getColors, radius, spacing } from '../../../src/theme';
import { PageHeader } from '../../../src/components/PageHeader';
import { computeAchievements, computeStreak, Achievement } from '../../../src/utils/achievements';

export default function AchievementsScreen() {
  const navigation = useNavigation<any>();
  const { entries, theme, language } = useApp();
  const colors = getColors(theme);
  const styles = getStyles(colors);

  useLayoutEffect(() => {
    navigation.setOptions({ headerTintColor: colors.text });
  }, [navigation, colors]);

  const streak = useMemo(() => computeStreak(entries), [entries]);
  const achievements = useMemo(() => computeAchievements(entries), [entries]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const overallPct = Math.round((unlockedCount / totalCount) * 100);

  const grouped = useMemo(() => {
    const map: Record<string, Achievement[]> = {};
    for (const a of achievements) {
      if (!map[a.category]) map[a.category] = [];
      map[a.category].push(a);
    }
    return map;
  }, [achievements]);

  const categoryLabels: Record<string, { tr: string; en: string; icon: any }> = {
    streak: { tr: 'Seriler', en: 'Streaks', icon: 'flash' },
    earnings: { tr: 'Kazanç', en: 'Earnings', icon: 'cash' },
    days: { tr: 'Çalışma Günleri', en: 'Work Days', icon: 'calendar' },
    variety: { tr: 'Çeşitlilik', en: 'Variety', icon: 'infinite' },
    consistency: { tr: 'Devamlılık', en: 'Consistency', icon: 'trending-up' },
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader
        title={language === 'tr' ? 'Rozetler' : 'Achievements'}
        showMonth={false}
        showProButton={false}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Hero */}
        <LinearGradient
          colors={[colors.warning, colors.danger]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.streakHero}
        >
          <View style={styles.streakLeft}>
            <View style={styles.flameRow}>
              <Ionicons name="flame" size={28} color="#FFFFFF" />
              <Text style={styles.streakValue}>{streak.current}</Text>
            </View>
            <Text style={styles.streakLabel}>
              {language === 'tr' ? 'Günlük Seri' : 'Day Streak'}
            </Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakRight}>
            <Text style={styles.streakBig}>{streak.longest}</Text>
            <Text style={styles.streakLabel}>
              {language === 'tr' ? 'En Uzun Seri' : 'Longest Streak'}
            </Text>
          </View>
        </LinearGradient>

        {/* Overall progress */}
        <View style={styles.overallCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overallLabel}>
              {language === 'tr' ? 'Toplam İlerleme' : 'Total Progress'}
            </Text>
            <Text style={styles.overallValue}>
              {unlockedCount} / {totalCount}
            </Text>
            <Text style={styles.overallSub}>
              {language === 'tr' ? 'Rozet açıldı' : 'Achievements unlocked'}
            </Text>
          </View>
          <ProgressRing pct={overallPct} colors={colors} />
        </View>

        {/* Categories */}
        {Object.entries(grouped).map(([cat, items]) => {
          const meta = categoryLabels[cat];
          const catUnlocked = items.filter((a) => a.unlocked).length;
          return (
            <View key={cat} style={{ marginTop: spacing.md }}>
              <View style={styles.catHeader}>
                <Ionicons name={meta.icon as any} size={16} color={colors.primary} />
                <Text style={styles.catTitle}>
                  {language === 'tr' ? meta.tr : meta.en}
                </Text>
                <Text style={styles.catCount}>
                  {catUnlocked}/{items.length}
                </Text>
              </View>
              <View style={{ gap: spacing.sm }}>
                {items.map((a) => (
                  <AchievementCard
                    key={a.id}
                    achievement={a}
                    colors={colors}
                    language={language}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressRing({ pct, colors }: { pct: number; colors: ReturnType<typeof getColors> }) {
  const size = 72;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
          opacity={0.4}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text
        style={{
          position: 'absolute',
          color: colors.text,
          fontSize: 15,
          fontWeight: '700',
        }}
      >
        {pct}%
      </Text>
    </View>
  );
}

function AchievementCard({
  achievement,
  colors,
  language,
}: {
  achievement: Achievement;
  colors: ReturnType<typeof getColors>;
  language: 'tr' | 'en';
}) {
  const pct = Math.min(100, Math.round((achievement.progress / achievement.target) * 100));
  const unlocked = achievement.unlocked;
  const title = language === 'tr' ? achievement.title : achievement.titleEn;
  const desc = language === 'tr' ? achievement.description : achievement.descriptionEn;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: unlocked ? achievement.color + '55' : colors.border,
        borderRadius: radius.lg,
        padding: spacing.md,
        opacity: unlocked ? 1 : 0.75,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: unlocked ? achievement.color : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={(unlocked ? achievement.icon : 'lock-closed') as any}
          size={22}
          color="#FFFFFF"
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 14,
              fontWeight: '700',
            }}
          >
            {title}
          </Text>
          {unlocked && (
            <Ionicons name="checkmark-circle" size={14} color={achievement.color} />
          )}
        </View>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 11,
            marginTop: 2,
          }}
          numberOfLines={2}
        >
          {desc}
        </Text>
        <View style={{ marginTop: 6 }}>
          <View
            style={{
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${pct}%` as any,
                height: 4,
                backgroundColor: achievement.color,
                borderRadius: 2,
              }}
            />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>
            {achievement.progress.toLocaleString('tr-TR')} / {achievement.target.toLocaleString('tr-TR')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    streakHero: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.lg,
      padding: spacing.md + 4,
      gap: spacing.md,
    },
    streakLeft: { flex: 1, alignItems: 'flex-start' },
    streakRight: { flex: 1, alignItems: 'flex-start' },
    streakDivider: {
      width: 1,
      height: 42,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    flameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    streakValue: {
      color: '#FFFFFF',
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -1,
    },
    streakBig: {
      color: '#FFFFFF',
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -1,
      paddingLeft: 6,
    },
    streakLabel: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 2,
    },
    overallCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.md,
      gap: spacing.md,
    },
    overallLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    overallValue: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '800',
      marginTop: 4,
    },
    overallSub: {
      color: colors.textMuted,
      fontSize: 12,
    },
    catHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: spacing.sm,
    },
    catTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    catCount: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
  });
