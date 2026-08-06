import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getColors, spacing, radius } from '../../theme';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { calculateSeverancePay, SEVERANCE_PAY_CEILING_2026 } from '../../utils/benefitsCalculations';
import { formatTL } from '../../utils/salary';

export function SeveranceCalculator() {
  const { language, theme } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);

  const [grossSalary, setGrossSalary] = useState('');
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [days, setDays] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleCalculate = () => {
    const salary = parseFloat(grossSalary);
    const y = parseInt(years) || 0;
    const m = parseInt(months) || 0;
    const d = parseInt(days) || 0;

    if (salary <= 0) {
      toast.warning(language === 'tr' ? 'Lütfen geçerli bir maaş girin' : 'Please enter a valid salary');
      return;
    }

    if (y === 0 && m === 0 && d === 0) {
      toast.warning(language === 'tr' ? 'Lütfen çalışma süresini girin' : 'Please enter tenure duration');
      return;
    }

    const calc = calculateSeverancePay(salary, y, m, d);
    setResult(calc);
  };

  return (
    <KeyboardAvoidingView style={[{ flex: 1 }, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            {language === 'tr' ? 'Kıdem Tazminatı Hesaplama' : 'Severance Pay Calculator'}
          </Text>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            {language === 'tr' ? '2026 yılı tavanlı tutar: ' : '2026 ceiling amount: '}
            {formatTL(SEVERANCE_PAY_CEILING_2026)}/yıl
          </Text>
          <Text style={[styles.infoNote, { color: colors.textDim }]}>
            {language === 'tr'
              ? 'Brüt Maaş × Kıdem Yılı (tavana kadar) - Damga Vergisi'
              : 'Gross Salary × Tenure Years (up to ceiling) - Stamp Tax'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            {language === 'tr' ? 'Brüt Aylık Maaş (₺)' : 'Gross Monthly Salary (₺)'}
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder={language === 'tr' ? 'Örn: 50000' : 'E.g: 50000'}
            placeholderTextColor={colors.textDim}
            value={grossSalary}
            onChangeText={setGrossSalary}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            {language === 'tr' ? 'Calisma Suresi' : 'Tenure Duration'}
          </Text>
          <View style={styles.tenureRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={[styles.smallLabel, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Yil' : 'Years'}
              </Text>
              <TextInput
                style={[styles.smallInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="0"
                placeholderTextColor={colors.textDim}
                value={years}
                onChangeText={setYears}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={[styles.smallLabel, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Ay' : 'Months'}
              </Text>
              <TextInput
                style={[styles.smallInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="0"
                placeholderTextColor={colors.textDim}
                value={months}
                onChangeText={setMonths}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.smallLabel, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Gun' : 'Days'}
              </Text>
              <TextInput
                style={[styles.smallInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="0"
                placeholderTextColor={colors.textDim}
                value={days}
                onChangeText={setDays}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        <Pressable onPress={handleCalculate}>
          <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
            <Ionicons name="calculator" color="#fff" size={18} />
            <Text style={styles.buttonText}>{language === 'tr' ? 'Hesapla' : 'Calculate'}</Text>
          </LinearGradient>
        </Pressable>

        {result && (
          <View style={[styles.resultBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.resultTitle, { color: colors.accent }]}>
              {language === 'tr' ? 'Sonuc' : 'Result'}
            </Text>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Toplam Kıdem' : 'Total Tenure'}
              </Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>
                {result.totalYears} {language === 'tr' ? 'yıl' : 'years'}
              </Text>
            </View>

            {result.isCapped && (
              <View style={[styles.warningBox, { borderColor: colors.accent }]}>
                <Ionicons name="alert-circle" size={16} color={colors.accent} />
                <Text style={[styles.warningText, { color: colors.accent }]}>
                  {language === 'tr' ? 'Tavana kadar hesaplanmistir' : 'Capped at ceiling amount'}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Brut Tazminat' : 'Gross Severance'}
              </Text>
              <Text style={[styles.resultAmount, { color: colors.text }]}>{formatTL(result.grossSeverance)}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.danger }]}>
                {language === 'tr' ? 'Damga Vergisi (-0.759%)' : 'Stamp Tax (-0.759%)'}
              </Text>
              <Text style={[styles.resultAmount, { color: colors.danger }]}>-{formatTL(result.stampTax)}</Text>
            </View>

            <View style={[styles.divider, { marginVertical: spacing.md }]} />

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.accent, fontWeight: '700' }]}>
                {language === 'tr' ? 'Net Tazminat' : 'Net Severance'}
              </Text>
              <Text style={[styles.finalAmount, { color: colors.accent }]}>{formatTL(result.netSeverance)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
    infoBox: {
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.xs,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    infoText: {
      fontSize: 13,
      fontWeight: '600',
    },
    infoNote: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: spacing.xs,
    },
    card: {
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    input: {
      fontSize: 16,
      fontWeight: '600',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderRadius: radius.md,
      backgroundColor: colors.bg,
    },
    tenureRow: {
      flexDirection: 'row',
    },
    smallLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.xs,
    },
    smallInput: {
      fontSize: 14,
      fontWeight: '600',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderWidth: 1,
      borderRadius: radius.md,
      backgroundColor: colors.bg,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
      borderRadius: radius.lg,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    resultBox: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
    },
    resultTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    resultLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    resultValue: {
      fontSize: 14,
      fontWeight: '700',
    },
    resultAmount: {
      fontSize: 16,
      fontWeight: '700',
    },
    finalAmount: {
      fontSize: 18,
      fontWeight: '800',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      backgroundColor: colors.bg,
    },
    warningText: {
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
  });
}
