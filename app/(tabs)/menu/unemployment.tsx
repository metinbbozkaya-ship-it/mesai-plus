import React, { useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Platform, KeyboardAvoidingView, FlatList } from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getColors, spacing, radius } from '../../../src/theme';
import { useApp } from '../../../src/context/AppContext';
import { useToast } from '../../../src/context/ToastContext';
import { t } from '../../../src/utils/i18n';
import { calculateUnemploymentBenefit, UNEMPLOYMENT_PERIODS, GROSS_MIN_WAGE_2026 } from '../../../src/utils/benefitsCalculations';
import { formatTL } from '../../../src/utils/salary';

export default function UnemploymentCalculatorScreen() {
  const navigation = useNavigation<any>();
  const { language, theme } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);

  const [lastFourMonths, setLastFourMonths] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(UNEMPLOYMENT_PERIODS[0]);
  const [result, setResult] = useState<any>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors]);

  const handleCalculate = () => {
    const salary = parseFloat(lastFourMonths);

    if (salary <= 0) {
      toast.warning(language === 'tr' ? 'Lütfen geçerli bir tutar girin' : 'Please enter a valid amount');
      return;
    }

    const calc = calculateUnemploymentBenefit(salary, selectedPeriod.premiumDays);
    setResult(calc);
  };

  return (
    <KeyboardAvoidingView style={[{ flex: 1 }, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            {language === 'tr' ? 'İşsizlik Maaşı Hesaplama' : 'Unemployment Benefit Calculator'}
          </Text>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            {language === 'tr' ? 'Asgari Ücret: ' : 'Min Wage: '}
            {formatTL(GROSS_MIN_WAGE_2026)}
          </Text>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            {language === 'tr'
              ? 'Min: '
              : 'Range: '}
            {formatTL(GROSS_MIN_WAGE_2026 * 0.4)} - {formatTL(GROSS_MIN_WAGE_2026 * 0.8)}
          </Text>
          <Text style={[styles.infoNote, { color: colors.textDim }]}>
            {language === 'tr'
              ? 'Son 4 ayın ortalamasının %40\'ı (Max: asgari ücretin %80\'i)'
              : '40% of last 4 months average (Max: 80% of min wage)'}
          </Text>
        </View>

        {/* Input Section */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            {language === 'tr' ? 'Son 4 Ayın Ort. Brüt Kazancı (₺)' : 'Last 4 Months Avg Gross (₺)'}
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder={language === 'tr' ? 'Örn: 50000' : 'E.g: 50000'}
            placeholderTextColor={colors.textDim}
            value={lastFourMonths}
            onChangeText={setLastFourMonths}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Premium Days Selection */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            {language === 'tr' ? 'Prim Ödeme Günü' : 'Premium Payment Days'}
          </Text>
          <FlatList
            data={UNEMPLOYMENT_PERIODS}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedPeriod(item)}
                style={[
                  styles.periodButton,
                  {
                    backgroundColor: selectedPeriod === item ? colors.accent + '20' : colors.bg,
                    borderColor: selectedPeriod === item ? colors.accent : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={selectedPeriod === item ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selectedPeriod === item ? colors.accent : colors.textMuted}
                />
                <Text
                  style={[
                    styles.periodText,
                    {
                      color: selectedPeriod === item ? colors.accent : colors.text,
                      fontWeight: selectedPeriod === item ? '700' : '600',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            )}
            keyExtractor={(item) => item.premiumDays.toString()}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        </View>

        {/* Calculate Button */}
        <Pressable onPress={handleCalculate}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Ionicons name="calculator" color="#fff" size={18} />
            <Text style={styles.buttonText}>
              {language === 'tr' ? 'Hesapla' : 'Calculate'}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Results */}
        {result && (
          <View style={[styles.resultBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.resultTitle, { color: colors.accent }]}>
              {language === 'tr' ? 'Sonuç' : 'Result'}
            </Text>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Yardım Süresi' : 'Benefit Duration'}
              </Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>
                {result.benefitMonths} {language === 'tr' ? 'ay' : 'months'}
              </Text>
            </View>

            {result.isCapped && (
              <View style={[styles.warningBox, { borderColor: colors.accent }]}>
                <Ionicons name="alert-circle" size={16} color={colors.accent} />
                <Text style={[styles.warningText, { color: colors.accent }]}>
                  {language === 'tr'
                    ? 'Tavana kadar kısıtlanmıştır'
                    : 'Capped at ceiling amount'}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <Text style={[styles.subTitle, { color: colors.textMuted }]}>
              {language === 'tr' ? 'Aylık Ödeme' : 'Monthly Payment'}
            </Text>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Brüt Maaş' : 'Gross Benefit'}
              </Text>
              <Text style={[styles.resultAmount, { color: colors.text }]}>
                {formatTL(result.monthlyGrossBenefit)}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.danger }]}>
                {language === 'tr' ? 'Damga Vergisi (-0.759%)' : 'Stamp Tax (-0.759%)'}
              </Text>
              <Text style={[styles.resultAmount, { color: colors.danger }]}>
                -{formatTL(result.monthlyStampTax)}
              </Text>
            </View>

            <View style={[styles.divider, { marginVertical: spacing.md }]} />

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.accent, fontWeight: '700' }]}>
                {language === 'tr' ? 'Aylık Net' : 'Monthly Net'}
              </Text>
              <Text style={[styles.finalAmount, { color: colors.accent }]}>
                {formatTL(result.monthlyNetBenefit)}
              </Text>
            </View>

            <View style={[styles.divider, { marginVertical: spacing.md }]} />

            <Text style={[styles.subTitle, { color: colors.textMuted }]}>
              {language === 'tr' ? 'Toplam Yardım' : 'Total Benefit'}
            </Text>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Brüt Toplam' : 'Gross Total'}
              </Text>
              <Text style={[styles.resultAmount, { color: colors.text }]}>
                {formatTL(result.totalGrossBenefit)}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.accent, fontWeight: '700' }]}>
                {language === 'tr' ? 'Net Toplam' : 'Net Total'}
              </Text>
              <Text style={[styles.finalAmount, { color: colors.accent }]}>
                {formatTL(result.totalNetBenefit)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: typeof import('../../../src/theme').darkColors) {
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
    periodButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    periodText: {
      fontSize: 14,
      flex: 1,
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
    subTitle: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
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
