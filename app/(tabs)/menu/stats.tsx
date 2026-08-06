import React, { useMemo, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import Svg, {
  Rect,
  Line,
  Polyline,
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Path,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { useApp } from '../../../src/context/AppContext';
import { getColors, radius, spacing } from '../../../src/theme';
import { PageHeader } from '../../../src/components/PageHeader';
import type { WorkEntry } from '../../../src/storage/db';

const MONTHS_TR_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const MONTHS_EN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fmtTL(n: number): string {
  try {
    return '₺' + Math.round(n).toLocaleString('tr-TR');
  } catch {
    return '₺' + Math.round(n);
  }
}

function fmtHours(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '') + ' sa';
}

interface YearStats {
  monthlyEarnings: number[]; // 12
  monthlyHours: number[];    // 12
  monthlyDays: number[];     // 12
  totalEarnings: number;
  totalHours: number;
  totalDays: number;
  avgMonthly: number;
  bestMonthIdx: number;
  bestMonthValue: number;
  worstMonthIdx: number;
  worstMonthValue: number;
  dayTypes: { weekday: number; saturday: number; sunday: number; holiday: number };
  dayTypeEarnings: { weekday: number; saturday: number; sunday: number; holiday: number };
}

function computeYearStats(entries: Record<string, WorkEntry>, year: number): YearStats {
  const monthlyEarnings = new Array(12).fill(0);
  const monthlyHours = new Array(12).fill(0);
  const monthlyDays = new Array(12).fill(0);
  const dayTypes = { weekday: 0, saturday: 0, sunday: 0, holiday: 0 };
  const dayTypeEarnings = { weekday: 0, saturday: 0, sunday: 0, holiday: 0 };

  for (const key of Object.keys(entries || {})) {
    if (!key.startsWith(`${year}-`)) continue;
    const e = entries[key];
    if (!e || e.isAbsence) continue;
    const month = parseInt(key.slice(5, 7), 10) - 1;
    if (month < 0 || month > 11) continue;
    const earn = Number(e.earnings) || 0;
    const hrs = Number(e.hours) || 0;
    monthlyEarnings[month] += earn;
    monthlyHours[month] += hrs;
    if (hrs > 0) monthlyDays[month] += 1;
    const dt = e.dayType || 'weekday';
    if (dt in dayTypes) {
      (dayTypes as any)[dt] += 1;
      (dayTypeEarnings as any)[dt] += earn;
    }
  }

  const totalEarnings = monthlyEarnings.reduce((a, b) => a + b, 0);
  const totalHours = monthlyHours.reduce((a, b) => a + b, 0);
  const totalDays = monthlyDays.reduce((a, b) => a + b, 0);
  const monthsWithData = monthlyEarnings.filter((v) => v > 0).length;
  const avgMonthly = monthsWithData > 0 ? totalEarnings / monthsWithData : 0;

  let bestMonthIdx = 0;
  let bestMonthValue = 0;
  let worstMonthIdx = -1;
  let worstMonthValue = Infinity;
  monthlyEarnings.forEach((v, i) => {
    if (v > bestMonthValue) {
      bestMonthValue = v;
      bestMonthIdx = i;
    }
    if (v > 0 && v < worstMonthValue) {
      worstMonthValue = v;
      worstMonthIdx = i;
    }
  });
  if (worstMonthIdx === -1) {
    worstMonthIdx = 0;
    worstMonthValue = 0;
  }

  return {
    monthlyEarnings,
    monthlyHours,
    monthlyDays,
    totalEarnings,
    totalHours,
    totalDays,
    avgMonthly,
    bestMonthIdx,
    bestMonthValue,
    worstMonthIdx,
    worstMonthValue,
    dayTypes,
    dayTypeEarnings,
  };
}

export default function StatsScreen() {
  const navigation = useNavigation<any>();
  const { entries, theme, language } = useApp();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const monthsShort = language === 'tr' ? MONTHS_TR_SHORT : MONTHS_EN_SHORT;
  const monthsLong = language === 'tr' ? MONTHS_TR : MONTHS_EN;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useLayoutEffect(() => {
    navigation.setOptions({ headerTintColor: colors.text });
  }, [navigation, colors]);

  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    ys.add(currentYear);
    for (const key of Object.keys(entries || {})) {
      const y = parseInt(key.slice(0, 4), 10);
      if (!isNaN(y)) ys.add(y);
    }
    return Array.from(ys).sort((a, b) => b - a);
  }, [entries, currentYear]);

  const stats = useMemo(() => computeYearStats(entries, selectedYear), [entries, selectedYear]);

  const width = Dimensions.get('window').width - spacing.md * 2;
  const chartInner = width - spacing.md * 2;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader
        title={language === 'tr' ? 'İstatistikler' : 'Statistics'}
        showMonth={false}
        showProButton={false}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Year selector */}
        <View style={styles.yearRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {availableYears.map((y) => {
              const active = y === selectedYear;
              return (
                <Pressable key={y} onPress={() => setSelectedYear(y)}>
                  {active ? (
                    <LinearGradient
                      colors={[colors.primary, colors.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.yearChipActive}
                    >
                      <Text style={styles.yearChipTextActive}>{y}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.yearChip}>
                      <Text style={styles.yearChipText}>{y}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryGrid}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bigCard}
          >
            <Text style={styles.bigCardLabel}>
              {language === 'tr' ? `${selectedYear} Toplam Kazanç` : `${selectedYear} Total Earnings`}
            </Text>
            <Text style={styles.bigCardValue}>{fmtTL(stats.totalEarnings)}</Text>
            <View style={styles.bigCardFooter}>
              <View style={styles.bigCardFooterItem}>
                <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                <Text style={styles.bigCardFooterText}>{fmtHours(stats.totalHours)}</Text>
              </View>
              <View style={styles.bigCardFooterItem}>
                <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
                <Text style={styles.bigCardFooterText}>
                  {stats.totalDays} {language === 'tr' ? 'gün' : 'days'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.smallRow}>
            <View style={styles.smallCard}>
              <Ionicons name="trending-up" size={18} color={colors.success} />
              <Text style={styles.smallCardLabel}>
                {language === 'tr' ? 'Aylık Ortalama' : 'Monthly Avg'}
              </Text>
              <Text style={styles.smallCardValue}>{fmtTL(stats.avgMonthly)}</Text>
            </View>
            <View style={styles.smallCard}>
              <Ionicons name="trophy" size={18} color="#F59E0B" />
              <Text style={styles.smallCardLabel}>
                {language === 'tr' ? 'En İyi Ay' : 'Best Month'}
              </Text>
              <Text style={styles.smallCardValue} numberOfLines={1}>
                {monthsShort[stats.bestMonthIdx]}
              </Text>
              <Text style={styles.smallCardSub}>{fmtTL(stats.bestMonthValue)}</Text>
            </View>
          </View>
        </View>

        {/* Monthly bar chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>
              {language === 'tr' ? 'Aylık Kazanç' : 'Monthly Earnings'}
            </Text>
            <Text style={styles.chartSubtitle}>
              {language === 'tr' ? 'Tıklayınca detay' : 'Tap for detail'}
            </Text>
          </View>
          <MonthlyBarChart
            values={stats.monthlyEarnings}
            labels={monthsShort}
            colors={colors}
            width={chartInner}
          />
        </View>

        {/* Line trend */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {language === 'tr' ? 'Yıllık Trend' : 'Yearly Trend'}
          </Text>
          <TrendLineChart
            values={stats.monthlyEarnings}
            labels={monthsShort}
            colors={colors}
            width={chartInner}
          />
        </View>

        {/* Day type distribution */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {language === 'tr' ? 'Gün Tipi Dağılımı' : 'Day Type Distribution'}
          </Text>
          <DayTypeDonut
            counts={stats.dayTypes}
            earnings={stats.dayTypeEarnings}
            colors={colors}
            language={language}
            width={chartInner}
          />
        </View>

        {/* Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.chartTitle}>
            {language === 'tr' ? 'Öngörüler' : 'Insights'}
          </Text>
          <InsightRow
            icon="flash"
            iconColor={colors.accent}
            label={
              language === 'tr'
                ? `En verimli ayın: ${monthsLong[stats.bestMonthIdx]}`
                : `Most productive month: ${monthsLong[stats.bestMonthIdx]}`
            }
            value={fmtTL(stats.bestMonthValue)}
            colors={colors}
          />
          {stats.totalDays > 0 && (
            <InsightRow
              icon="analytics"
              iconColor={colors.primary}
              label={
                language === 'tr'
                  ? 'Günlük ortalama kazanç'
                  : 'Daily average earnings'
              }
              value={fmtTL(stats.totalEarnings / stats.totalDays)}
              colors={colors}
            />
          )}
          {stats.totalHours > 0 && (
            <InsightRow
              icon="cash"
              iconColor={colors.success}
              label={
                language === 'tr' ? 'Saatlik ortalama' : 'Hourly average'
              }
              value={fmtTL(stats.totalEarnings / stats.totalHours)}
              colors={colors}
            />
          )}
          <InsightRow
            icon="sunny"
            iconColor="#F59E0B"
            label={
              language === 'tr'
                ? 'Tatil günü çalışma'
                : 'Holiday days worked'
            }
            value={`${stats.dayTypes.holiday + stats.dayTypes.sunday} ${language === 'tr' ? 'gün' : 'days'}`}
            colors={colors}
            last
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============ CHART COMPONENTS ============

interface ChartProps {
  values: number[];
  labels: string[];
  colors: ReturnType<typeof getColors>;
  width: number;
}

function MonthlyBarChart({ values, labels, colors, width }: ChartProps) {
  const height = 180;
  const barGap = 6;
  const barW = (width - barGap * 11) / 12;
  const max = Math.max(1, ...values);
  const gradId = 'monthly-grad';

  return (
    <View>
      <Svg width={width} height={height + 24}>
        <Defs>
          <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accent} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0.85" />
          </SvgGradient>
        </Defs>
        {values.map((v, i) => {
          const h = v > 0 ? Math.max(4, (v / max) * (height - 20)) : 0;
          const x = i * (barW + barGap);
          const y = height - h;
          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={4}
                fill={v === 0 ? colors.border : `url(#${gradId})`}
                opacity={v === 0 ? 0.35 : 1}
              />
              <SvgText
                x={x + barW / 2}
                y={height + 16}
                fontSize="10"
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {labels[i]}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function TrendLineChart({ values, labels, colors, width }: ChartProps) {
  const height = 160;
  const padX = 8;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const max = Math.max(1, ...values);
  const stepX = innerW / 11;
  const gradId = 'trend-grad';
  const areaId = 'trend-area';

  const points = values.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - (v / max) * innerH;
    return { x, y, v };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${padX + innerW},${padY + innerH} L${padX},${padY + innerH} Z`;

  return (
    <View>
      <Svg width={width} height={height + 24}>
        <Defs>
          <SvgGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="1" />
          </SvgGradient>
          <SvgGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.35" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </SvgGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((r) => (
          <Line
            key={r}
            x1={padX}
            y1={padY + innerH * r}
            x2={padX + innerW}
            y2={padY + innerH * r}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="3,4"
          />
        ))}

        <Path d={areaPath} fill={`url(#${areaId})`} />
        <Path d={linePath} stroke={`url(#${gradId})`} strokeWidth={2.5} fill="none" />

        {points.map((p, i) =>
          p.v > 0 ? (
            <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={colors.accent} stroke={colors.bg} strokeWidth={1.5} />
          ) : null
        )}

        {labels.map((l, i) => (
          <SvgText
            key={i}
            x={padX + i * stepX}
            y={height + 16}
            fontSize="9"
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {l}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

interface DonutProps {
  counts: { weekday: number; saturday: number; sunday: number; holiday: number };
  earnings: { weekday: number; saturday: number; sunday: number; holiday: number };
  colors: ReturnType<typeof getColors>;
  language: 'tr' | 'en';
  width: number;
}

function DayTypeDonut({ counts, earnings, colors, language, width }: DonutProps) {
  const size = Math.min(width, 180);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;
  const stroke = 20;

  const items = [
    { key: 'weekday', label: language === 'tr' ? 'Hafta içi' : 'Weekday', count: counts.weekday, earn: earnings.weekday, color: colors.primary },
    { key: 'saturday', label: language === 'tr' ? 'Cumartesi' : 'Saturday', count: counts.saturday, earn: earnings.saturday, color: colors.accent },
    { key: 'sunday', label: language === 'tr' ? 'Pazar' : 'Sunday', count: counts.sunday, earn: earnings.sunday, color: '#F59E0B' },
    { key: 'holiday', label: language === 'tr' ? 'Tatil' : 'Holiday', count: counts.holiday, earn: earnings.holiday, color: colors.danger },
  ];

  const total = items.reduce((a, b) => a + b.count, 0);
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = items.map((it) => {
    const frac = total > 0 ? it.count / total : 0;
    const len = frac * circumference;
    const arc = {
      color: it.color,
      dashArray: `${len} ${circumference}`,
      dashOffset: -offset,
    };
    offset += len;
    return arc;
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          <Circle cx={cx} cy={cy} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" opacity={0.3} />
          {total > 0 &&
            arcs.map((a, i) => (
              <Circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                stroke={a.color}
                strokeWidth={stroke}
                strokeDasharray={a.dashArray}
                strokeDashoffset={a.dashOffset}
                fill="none"
                strokeLinecap="butt"
              />
            ))}
        </G>
        <SvgText x={cx} y={cy - 4} fontSize="22" fontWeight="700" fill={colors.text} textAnchor="middle">
          {total}
        </SvgText>
        <SvgText x={cx} y={cy + 16} fontSize="11" fill={colors.textMuted} textAnchor="middle">
          {language === 'tr' ? 'gün' : 'days'}
        </SvgText>
      </Svg>
      <View style={{ flex: 1, gap: 8 }}>
        {items.map((it) => (
          <View key={it.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: it.color }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{it.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                {it.count} {language === 'tr' ? 'gün' : 'd'} • {fmtTL(it.earn)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

interface InsightRowProps {
  icon: any;
  iconColor: string;
  label: string;
  value: string;
  colors: ReturnType<typeof getColors>;
  last?: boolean;
}

function InsightRow({ icon, iconColor, label, value, colors, last }: InsightRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: iconColor + '22',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    yearRow: {
      marginBottom: spacing.md,
    },
    yearChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    yearChipText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    yearChipActive: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radius.full,
    },
    yearChipTextActive: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    summaryGrid: {
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    bigCard: {
      borderRadius: radius.lg,
      padding: spacing.md + 4,
    },
    bigCardLabel: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    bigCardValue: {
      color: '#FFFFFF',
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    bigCardFooter: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 12,
    },
    bigCardFooterItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    bigCardFooterText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    smallRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    smallCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: 4,
    },
    smallCardLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 4,
    },
    smallCardValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    smallCardSub: {
      color: colors.textMuted,
      fontSize: 11,
    },
    chartCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    chartTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    chartSubtitle: {
      color: colors.textMuted,
      fontSize: 11,
    },
    insightsCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
  });
