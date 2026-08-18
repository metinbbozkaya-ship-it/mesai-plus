import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getColors, radius, spacing } from '../../../src/theme';
import { useApp } from '../../../src/context/AppContext';
import { usePro } from '../../../src/context/ProContext';
import { useToast } from '../../../src/context/ToastContext';
import { ProGate } from '../../../src/components/ProGate';
import { loadAllowance, saveAllowance, AllowanceSettings, DEFAULT_ALLOWANCE } from '../../../src/storage/finance';
import { loadEntries } from '../../../src/storage/db';

export default function AllowancesScreen() {
  const { theme, language } = useApp();
  const { isPro } = usePro();
  const toast = useToast();
  const router = useRouter();
  const colors = getColors(theme);
  const isTr = language === 'tr';

  const [s, setS] = useState<AllowanceSettings>(DEFAULT_ALLOWANCE);
  const [monthDaysWorked, setMonthDaysWorked] = useState(0);

  useEffect(() => {
    (async () => {
      setS(await loadAllowance());
      const entries = await loadEntries();
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth();
      let cnt = 0;
      Object.values(entries).forEach(e => {
        const d = new Date(e.date);
        if (d.getFullYear() === y && d.getMonth() === m && !e.isAbsence && e.hours > 0) cnt++;
      });
      setMonthDaysWorked(cnt);
    })();
  }, []);

  const perDay = s.transportPerDay + s.mealPerDay + s.otherPerDay;
  const monthlyEstimate = perDay * monthDaysWorked;

  const save = async (patch: Partial<AllowanceSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    await saveAllowance(next);
    toast.success(isTr ? 'Kaydedildi' : 'Saved');
  };

  const updNum = (k: keyof AllowanceSettings) => (t: string) => {
    const n = parseFloat(t.replace(',', '.'));
    const val = isFinite(n) ? n : 0;
    setS(prev => ({ ...prev, [k]: val }));
  };

  const commitNum = (k: keyof AllowanceSettings) => () => {
    save({ [k]: s[k] } as any);
  };

  if (!isPro) {
    return <ProGate icon="car-outline"
      title={isTr ? '🚗 Yol / Yemek Ücreti' : '🚗 Transport / Meal Allowance'}
      subtitle={isTr ? 'Günlük yol, yemek ve diğer ödemeleri kazançlarınıza ekleyin.' : 'Add daily transport, meal and other allowances to your earnings.'}
      features={[
        isTr ? '✅ 3 ayrı günlük ödeme kalemi' : '✅ 3 separate daily items',
        isTr ? '✅ Otomatik aylık hesap' : '✅ Auto monthly calculation',
        isTr ? '✅ Çalışılan günüe göre dinamik' : '✅ Based on worked days',
      ]}
    />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <LinearGradient colors={[colors.bg, colors.bg2]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isTr ? 'Yol / Yemek Ücreti' : 'Transport / Meal'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>{isTr ? 'Bu Ay Tahmini' : 'This Month Estimate'}</Text>
          <Text style={styles.heroAmount}>₺{monthlyEstimate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={styles.heroSub}>{isTr ? `${monthDaysWorked} gün × ₺${perDay.toFixed(2)}/gün` : `${monthDaysWorked} days × ₺${perDay.toFixed(2)}/day`}</Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{isTr ? 'Etkin' : 'Enabled'}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{isTr ? 'Kazanç hesabına dahil et' : 'Include in earnings'}</Text>
          </View>
          <Switch value={s.enabled} onValueChange={(v) => save({ enabled: v })} trackColor={{ false: colors.border, true: colors.primary }} />
        </View>

        {([
          { k: 'transportPerDay' as const, label: isTr ? '🚗 Yol Ücreti (günlük)' : '🚗 Transport (per day)', v: s.transportPerDay },
          { k: 'mealPerDay' as const, label: isTr ? '🍴 Yemek Ücreti (günlük)' : '🍴 Meal (per day)', v: s.mealPerDay },
          { k: 'otherPerDay' as const, label: isTr ? '💼 Diğer (günlük)' : '💼 Other (per day)', v: s.otherPerDay },
        ]).map(row => (
          <View key={row.k} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>{row.label}</Text>
            <TextInput
              value={String(row.v || '')}
              onChangeText={updNum(row.k)}
              onBlur={commitNum(row.k)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
            />
          </View>
        ))}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>{isTr ? 'Özet' : 'Summary'}</Text>
          <Row label={isTr ? 'Günlük toplam' : 'Daily total'} value={`₺${perDay.toFixed(2)}`} colors={colors} />
          <Row label={isTr ? 'Çalışılan gün (bu ay)' : 'Days worked (this month)'} value={String(monthDaysWorked)} colors={colors} />
          <Row label={isTr ? 'Aylık tahmini' : 'Monthly estimate'} value={`₺${monthlyEstimate.toFixed(2)}`} colors={colors} bold />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 4 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  hero: { padding: spacing.lg, borderRadius: 32, marginBottom: spacing.md },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});
