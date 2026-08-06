import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getColors, radius, spacing } from '../../../src/theme';
import { useApp } from '../../../src/context/AppContext';
import { usePro } from '../../../src/context/ProContext';
import { ProGate } from '../../../src/components/ProGate';

// SSK 4/a emeklilik: 7200 gün (25 yıl) klasik koşul
const TARGET_DAYS = 7200;

export default function SgkPremiumScreen() {
  const { theme, language } = useApp();
  const { isPro } = usePro();
  const colors = getColors(theme);
  const isTr = language === 'tr';

  const [currentDays, setCurrentDays] = useState('');
  const [monthlyDays, setMonthlyDays] = useState('30');

  const calc = useMemo(() => {
    const cur = parseInt(currentDays || '0', 10) || 0;
    const per = parseInt(monthlyDays || '30', 10) || 30;
    const remaining = Math.max(0, TARGET_DAYS - cur);
    const monthsLeft = per > 0 ? Math.ceil(remaining / per) : 0;
    const yearsLeft = monthsLeft / 12;
    const progress = Math.min(1, cur / TARGET_DAYS);
    const retireDate = new Date();
    retireDate.setMonth(retireDate.getMonth() + monthsLeft);
    return { cur, remaining, monthsLeft, yearsLeft, progress, retireDate };
  }, [currentDays, monthlyDays]);

  if (!isPro) {
    return <ProGate icon="shield-checkmark-outline"
      title={isTr ? '🧾 SGK Prim Hesaplayıcı' : '🧾 SGK Premium Calculator'}
      subtitle={isTr ? 'Emekliliğinize ne kadar gün kaldığını anında hesaplayın.' : 'Instantly calculate how many days you have left for retirement.'}
      features={[
        isTr ? '✅ 7200 gün hedef takibi' : '✅ 7200-day target tracking',
        isTr ? '✅ Kalan yıl/ay tahmini' : '✅ Remaining years/months estimate',
        isTr ? '✅ Tahmini emeklilik tarihi' : '✅ Estimated retirement date',
      ]}
    />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <LinearGradient colors={[colors.bg, colors.bg2]} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>{isTr ? 'Emekliliğe Kalan' : 'Left to Retire'}</Text>
          <Text style={styles.heroAmount}>{calc.remaining.toLocaleString('tr-TR')}</Text>
          <Text style={styles.heroSub}>{isTr ? `gün (${TARGET_DAYS} gün hedefi)` : `days (target ${TARGET_DAYS})`}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${calc.progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{(calc.progress * 100).toFixed(1)}%</Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>{isTr ? 'Mevcut Prim Günü' : 'Current Premium Days'}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>{isTr ? 'e-Devlet SGK Tescil ve Hizmet Dökümünden öğrenebilirsiniz' : 'Check via e-Devlet SGK record'}</Text>
          <TextInput value={currentDays} onChangeText={setCurrentDays} keyboardType="number-pad" placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>{isTr ? 'Aylık Prim Günü (varsayılan 30)' : 'Monthly Premium Days (default 30)'}</Text>
          <TextInput value={monthlyDays} onChangeText={setMonthlyDays} keyboardType="number-pad" placeholder="30"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: spacing.sm }}>{isTr ? 'Özet' : 'Summary'}</Text>
          <Row label={isTr ? 'Kalan gün' : 'Remaining days'} value={calc.remaining.toLocaleString('tr-TR')} colors={colors} />
          <Row label={isTr ? 'Kalan ay' : 'Remaining months'} value={String(calc.monthsLeft)} colors={colors} />
          <Row label={isTr ? 'Kalan yıl' : 'Remaining years'} value={calc.yearsLeft.toFixed(1)} colors={colors} />
          <Row label={isTr ? 'Tahmini tarih' : 'Estimated date'} value={calc.retireDate.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })} colors={colors} bold />
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.md }}>
          {isTr ? '⚠️ Hesaplama tahmindir. Yaş, sigorta başlangıcı ve mevzuat değişikliklerine göre fark edebilir.' : '⚠️ Estimate only. May vary by age, insurance start date and law changes.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, colors, bold }: { label: string; value: string; colors: any; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: bold ? colors.accent : colors.text, fontWeight: bold ? '800' : '600', fontSize: 15 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroAmount: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  progressBar: { height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 4 },
  progressText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 6, textAlign: 'right' },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});
