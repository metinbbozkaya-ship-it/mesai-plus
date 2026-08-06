import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Platform, KeyboardAvoidingView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getColors, spacing, radius } from '../../theme';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { t } from '../../utils/i18n';
import { calculateNoticePay, NOTICE_PERIODS } from '../../utils/benefitsCalculations';
import { formatTL } from '../../utils/salary';

export function NoticeCalculator() {
  
  const { language, theme } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);

  const [grossSalary, setGrossSalary] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(NOTICE_PERIODS[0]);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = () => {
    const salary = parseFloat(grossSalary);

    if (salary <= 0) {
      toast.warning(language === 'tr' ? 'Lütfen geçerli bir maaş girin' : 'Please enter a valid salary');
      return;
    }

    // Calculate tenure in months based on selected period (use midpoint)
    const tenureMonths = selectedPeriod.minMonths + ((selectedPeriod.maxMonths - selectedPeriod.minMonths) / 2);
    const calc = calculateNoticePay(salary, tenureMonths);
    setResult(calc);
  };

  return (
    <KeyboardAvoidingView style={[{ flex: 1 }, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            {language === 'tr' ? 'İhbar Tazminatı Hesaplama' : 'Notice Pay Calculator'}
          </Text>
          <Text style={[styles.infoNote, { color: colors.textDim }]}>
            {language === 'tr'
              ? 'Kıdeme göre 2-8 haftalık bildirim süresi'
              : '2-8 weeks notice period based on tenure'}
          </Text>
        </View>

        {/* Input Section */}
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

        {/* Tenure Selection */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            {language === 'tr' ? 'Çalışma Süresi' : 'Tenure Duration'}
          </Text>
          <FlatList
            data={NOTICE_PERIODS}
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
            keyExtractor={(item) => item.weeks.toString()}
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
                {language === 'tr' ? 'Bildirim Süresi' : 'Notice Period'}
              </Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>
                {result.noticeDays} {language === 'tr' ? 'gün' : 'days'}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Günlük Ücret' : 'Daily Wage'}
              </Text>
              <Text style={[styles.resultAmount, { color: colors.text }]}>
                {formatTL(result.dailyGrossWage)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Brüt İhbar Tazminatı' : 'Gross Notice Pay'}
              </Text>
              <Text style={[styles.resultAmount, { color: colors.text }]}>
                {formatTL(result.grossNoticePay)}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.danger }]}>
                {language === 'tr' ? 'Kesintiler (-' : 'Deductions (-'}
                {((result.stampTax + result.incomeTax) / result.grossNoticePay * 100).toFixed(1)}%)
              </Text>
              <Text style={[styles.resultAmount, { color: colors.danger }]}>
                -{formatTL(result.totalDeductions)}
              </Text>
            </View>

            <View style={[styles.divider, { marginVertical: spacing.md }]} />

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.accent, fontWeight: '700' }]}>
                {language === 'tr' ? 'Net İhbar Tazminatı' : 'Net Notice Pay'}
              </Text>
              <Text style={[styles.finalAmount, { color: colors.accent }]}>
                {formatTL(result.netNoticePay)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: typeof import('../../theme').darkColors) {
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
  });
}
