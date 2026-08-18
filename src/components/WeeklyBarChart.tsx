import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { getColors, radius, spacing } from '../theme';

interface Props {
  /** 7 daily values for the last 7 days (index 0 = 6 days ago, index 6 = today) */
  weekly: number[];
  theme: 'light' | 'dark';
  language: 'tr' | 'en';
  title?: string;
  /** day labels for each of the 7 bars, matching `weekly` order */
  labels: string[];
}

export function WeeklyBarChart({ weekly, theme, language, title, labels }: Props) {
  const colors = getColors(theme);
  const chartWidth = Dimensions.get('window').width - spacing.md * 4;
  const chartHeight = 110;
  const barGap = 10;
  const barW = (chartWidth - barGap * 6) / 7;

  const max = useMemo(() => Math.max(1, ...weekly.map(v => Math.abs(v))), [weekly]);
  const isEmpty = useMemo(() => weekly.every(v => v === 0), [weekly]);

  const gradId = 'wbc-grad';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      {isEmpty ? (
        <View style={[styles.emptyWrap, { height: chartHeight }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {language === 'tr' ? 'Henüz grafik verisi yok.' : 'No chart data yet.'}
          </Text>
        </View>
      ) : (
        <>
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity="1" />
                <Stop offset="1" stopColor={colors.primary} stopOpacity="0.85" />
              </SvgGradient>
            </Defs>
            {weekly.map((v, i) => {
              const h = Math.max(3, (Math.abs(v) / max) * (chartHeight - 4));
              const x = i * (barW + barGap);
              const y = chartHeight - h;
              return (
                <Rect
                  key={i}
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={6}
                  fill={v === 0 ? colors.border : v < 0 ? colors.danger : `url(#${gradId})`}
                  opacity={v === 0 ? 0.4 : 1}
                />
              );
            })}
          </Svg>
          <View style={styles.labels}>
            {labels.map((l, i) => (
              <Text key={i} style={[styles.dayLabel, { color: colors.textMuted, width: barW, marginRight: i < 6 ? barGap : 0 }]}>
                {l}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    opacity: 0.85,
  },
  labels: {
    flexDirection: 'row',
    marginTop: 6,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
