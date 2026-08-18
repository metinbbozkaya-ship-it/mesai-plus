import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useApp } from '../../../src/context/AppContext';
import { useToast } from '../../../src/context/ToastContext';
import { getColors, radius, spacing } from '../../../src/theme';
import { t } from '../../../src/utils/i18n';
import { EmptyState } from '../../../src/components/EmptyState';
import { PageHeader } from '../../../src/components/PageHeader';

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export default function SalaryScreen() {
  const navigation = useNavigation<any>();
  const { settings, updateSettings, language, theme } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);

  const [salaries, setSalaries] = useState<Record<string, string>>({});
  const [savedFlash, setSavedFlash] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors]);

  useEffect(() => {
    const newSalaries: Record<string, string> = {};
    MONTH_KEYS.forEach((key) => {
      const value = settings?.monthlySalaries?.[key] ?? 0;
      newSalaries[key] = value > 0 ? value.toString() : '';
    });
    setSalaries(newSalaries);
  }, [settings?.monthlySalaries]);

  const handleSave = async () => {
    try {
      const updatedSalaries: Record<string, number> = {};
      MONTH_KEYS.forEach((key) => {
        const value = parseFloat(salaries[key]) || 0;
        if (value < 0) {
          toast.warning(language === 'tr' ? 'Maaş negatif olamaz' : 'Salary cannot be negative');
          throw new Error('Negative salary');
        }
        updatedSalaries[key] = value;
      });

      await updateSettings({
        ...settings,
        monthlySalaries: updatedSalaries,
      });

      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    } catch (e) {
      if ((e as Error).message !== 'Negative salary') {
        toast.error(language === 'tr' ? 'Kaydedilemedi' : 'Failed to save');
      }
    }
  };

  const handleSalaryChange = (monthKey: string, value: string) => {
    setSalaries({ ...salaries, [monthKey]: value });
  };

  const handleSalaryBlur = (monthKey: string) => {
    const value = salaries[monthKey];
    if (value && value.trim()) {
      const monthIndex = MONTH_KEYS.indexOf(monthKey);
      const newSalaries = { ...salaries };
      for (let i = monthIndex + 1; i < MONTH_KEYS.length; i++) {
        newSalaries[MONTH_KEYS[i]] = value;
      }
      setSalaries(newSalaries);
    }
  };

  const monthNames = language === 'tr' ? MONTHS_TR : MONTHS_EN;

  const now = new Date();
  const currentMonthLabel = monthNames[now.getMonth()];
  const currentMonthSalary = settings?.monthlySalaries?.[MONTH_KEYS[now.getMonth()]] ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <PageHeader title={language === 'tr' ? 'Maaş' : 'Salary'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.currentMonthHero}
          >
            <View>
              <Text style={styles.currentMonthLabel}>{language === 'tr' ? 'BU AY' : 'THIS MONTH'}</Text>
              <Text style={styles.currentMonthDate}>{currentMonthLabel} {now.getFullYear()}</Text>
            </View>
            <Text style={styles.currentMonthAmount}>
              ₺{currentMonthSalary.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </LinearGradient>

          {Object.values(salaries).every((v) => !v || parseFloat(v) === 0) && (
            <View style={{ marginBottom: spacing.md }}>
              <EmptyState
                language={language}
                theme={theme}
                icon="cash-outline"
                title={language === 'tr' ? 'Henüz maaş girilmedi' : 'No salary entered yet'}
                message={language === 'tr' ? 'Aylık maaşınızı girerek mesai hesaplamalarına başlayın.' : 'Enter your monthly salary to start overtime calculations.'}
                buttonLabel={language === 'tr' ? 'Hemen Başla' : 'Get Started'}
              />
            </View>
          )}

          <View style={styles.monthsGrid}>
            {MONTH_KEYS.map((key, index) => (
              <View key={key} style={styles.monthCard}>
                <Text style={styles.monthLabel}>{monthNames[index]}</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    value={salaries[key] || ''}
                    onChangeText={(text) => handleSalaryChange(key, text)}
                    onBlur={() => handleSalaryBlur(key)}
                    placeholder="0"
                    placeholderTextColor={colors.textDim}
                    style={styles.input}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.currencySymbol}>₺</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.accent} />
            <Text style={styles.infoText}>
              {language === 'tr'
                ? 'Bir ay değiştirdiğinizde, o aydan itibaren tüm sonraki aylar otomatik olarak aynı maaş ile doldurulur.'
                : 'When you enter a salary for any month, all subsequent months are automatically filled with the same amount.'}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {savedFlash ? (language === 'tr' ? 'Kaydedildi' : 'Saved') : t(language, 'save')}
                </Text>
                <Ionicons
                  name={savedFlash ? 'checkmark' : 'save'}
                  size={20}
                  color="#fff"
                />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(colors: typeof import('../../../src/theme').darkColors) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    currentMonthHero: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      marginBottom: spacing.sm,
    },
    currentMonthLabel: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    currentMonthDate: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      marginTop: 2,
    },
    currentMonthAmount: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '800',
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    emoji: {
      fontSize: 32,
      marginBottom: spacing.xs,
    },
    pageTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: spacing.xs,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
      maxWidth: 280,
    },
    monthsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    monthCard: {
      width: '31%',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: spacing.xs,
    },
    inputContainer: {
      position: 'relative',
    },
    input: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      paddingVertical: spacing.xs,
      borderBottomWidth: 2,
      borderBottomColor: colors.border,
    },
    currencySymbol: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '700',
      marginTop: spacing.xs,
    },
    infoBox: {
      flexDirection: 'row',
      backgroundColor: `${colors.accent}15`,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    infoText: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    button: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      minWidth: 200,
    },
    buttonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
