import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getColors, radius, spacing } from '../../../src/theme';
import { useApp } from '../../../src/context/AppContext';
import { usePro } from '../../../src/context/ProContext';
import { ProGate } from '../../../src/components/ProGate';
import { loadEntries } from '../../../src/storage/db';

const MIN_WAGE_NET_2025 = 28075.50;
const MIN_WAGE_GROSS_2025 = 33030.00;
const MIN_WAGE_YEAR = 2026;

export default function MinimumWageScreen() {
  const { theme, language } = useApp();
  const { isPro } = usePro();
  const colors = getColors(theme);
  const isTr = language === 'tr';

  const [monthlyEarnings, setMonthlyEarnings] = useState('');

  useEffect(() => {
    (async () => {
      const entries = await loadEntries();
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth();
      let total = 0;
      Object.values(entries).forEach(e => {
        const d = new Date(e.date);
        if (d.getFullYear() === y && d.getMonth() === m) total += e.earnings || 0;
      });
      if (total > 0) setMonthlyEarnings(String(Math.round(total)));
    })();
  }, []);

  const calc = useMemo(() => {
    const n = parseFloat(monthlyEarnings.replace(',', '.')) || 0;
    const netMultiplier = n / MIN_WAGE_NET_2025;
    const grossMultiplier = n / MIN_WAGE_GROSS_2025;
    const diff = n - MIN_WAGE_NET_2025;
    return { n, netMultiplier, grossMultiplier, diff };
  }, [monthlyEarnings]);

  if (!isPro) {
    return <ProGate icon="trending-up-outline"
      title={isTr ? '💰 Asgari Ücret Karşılaştırma' : '💰 Minimum Wage Comparison'}
      subtitle={isTr ? 'Kazancınızı güncel asgari ücret ile karşılaştırın.' : 'Compare your income with the current minimum wage.'}
      features={[
        isTr ? '✅ Net ve brüt karşılaştırma' : '✅ Net and gross comparison',
        isTr ? '✅ Kaç katı kazandığınızı gösterir' : '✅ Shows earnings multiplier',
        isTr ? '✅ 2025 güncel rakamlar' : '✅ 2025 up-to-date figures',
      ]}
    />;
  }

  const barPct = Math.min(100, (calc.n / (MIN_WAGE_NET_2025 * 5)) * 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <LinearGradient colors={[colors.bg, colors.bg2]} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Ionicons name="trending-up" size={26} color="#FFFFFF" />
          <Text style={styles.heroLabel}>{isTr ? 'Kazancınız' : 'Your Earnings'}</Text>
          <Text style={styles.heroAmount}>×{calc.netMultiplier.toFixed(2)}</Text>
          <Text style={styles.heroSub}>{isTr ? 'net asgari ücretin katı' : 'of net minimum wage'}</Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>{isTr ? 'Aylık Kazancınız (₺)' : 'Your Monthly Earnings'}</Text>
          <TextInput value={monthlyEarnings} onChangeText={setMonthlyEarnings} keyboardType="decimal-pad" placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
            {isTr ? 'Bu ayın girdilerinizden otomatik dolduruldu' : 'Auto-filled from this month’s entries'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: spacing.sm }}>{isTr ? '2026 Asgari Ücret' : '2026 Minimum Wage'}</Text>
          <Row label={isTr ? 'Net' : 'Net'} value={`₺${MIN_WAGE_NET_2025.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`} colors={colors} />
          <Row label={isTr ? 'Brüt' : 'Gross'} value={`₺${MIN_WAGE_GROSS_2025.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`} colors={colors} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: spacing.sm }}>{isTr ? 'Karşılaştırma' : 'Comparison'}</Text>
          <Row label={isTr ? 'Net asgari ücretin katı' : 'Multiple of net min. wage'} value={`×${calc.netMultiplier.toFixed(2)}`} colors={colors} bold />
          <Row label={isTr ? 'Brüt asgari ücretin katı' : 'Multiple of gross min. wage'} value={`×${calc.grossMultiplier.toFixed(2)}`} colors={colors} />
          <Row label={isTr ? 'Fark (net)' : 'Difference (net)'} value={`${calc.diff >= 0 ? '+' : ''}₺${calc.diff.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} colors={colors} highlight={calc.diff >= 0 ? '#10B981' : '#EF4444'} />

          <View style={[styles.bar, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: `${barPct}%`, backgroundColor: colors.accent }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>×0</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>×5+</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, colors, bold, highlight }: { label: string; value: string; colors: any; bold?: boolean; highlight?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: highlight || (bold ? colors.accent : colors.text), fontWeight: bold ? '800' : '600', fontSize: 15 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md, alignItems: 'flex-start' },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: 8 },
  heroAmount: { color: '#FFFFFF', fontSize: 48, fontWeight: '800', marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  bar: { height: 10, borderRadius: 5, marginTop: 14, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
});
