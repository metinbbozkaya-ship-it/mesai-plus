import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { useToast } from '../../src/context/ToastContext';
import { getColors, spacing, radius } from '../../src/theme';
import { ONBOARDING_KEY } from '../../src/storage/db';

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

const WEEKLY_HOUR_PRESETS = [40, 45, 48];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingScreen() {
  const router = useRouter();
  const { language, theme, settings, updateSettings } = useApp();
  const toast = useToast();
  const isTr = language === 'tr';
  const colors = getColors(theme);
  const styles = getStyles(colors);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [salary, setSalary] = useState('');
  const [weeklyHoursChip, setWeeklyHoursChip] = useState<number | 'other'>(45);
  const [weeklyHoursCustom, setWeeklyHoursCustom] = useState('');
  const [finishing, setFinishing] = useState(false);

  const resolvedWeeklyHours = weeklyHoursChip === 'other' ? weeklyHoursCustom : String(weeklyHoursChip);

  const handleStart = async () => {
    if (finishing) return;

    if (!firstName.trim()) {
      toast.warning(isTr ? 'Lütfen adınızı girin' : 'Please enter your first name');
      return;
    }
    if (!lastName.trim()) {
      toast.warning(isTr ? 'Lütfen soyadınızı girin' : 'Please enter your last name');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      toast.warning(isTr ? 'Lütfen geçerli bir e-posta adresi girin' : 'Please enter a valid email address');
      return;
    }
    const salaryNum = parseFloat(salary.replace(',', '.'));
    if (!isFinite(salaryNum) || salaryNum <= 0) {
      toast.warning(isTr ? 'Lütfen geçerli bir maaş girin' : 'Please enter a valid salary');
      return;
    }
    const hoursNum = parseFloat(resolvedWeeklyHours.replace(',', '.'));
    if (!isFinite(hoursNum) || hoursNum <= 0 || hoursNum > 80) {
      toast.warning(isTr ? 'Haftalık saat 1-80 arasında olmalı' : 'Weekly hours must be between 1 and 80');
      return;
    }

    setFinishing(true);
    try {
      // Same forward-cascade convention as the Maaş screen (handleSalaryBlur):
      // the entered salary fills the current month and every month after it.
      const monthly: Record<string, number> = { ...(settings.monthlySalaries || {}) };
      const startIdx = new Date().getMonth();
      for (let i = startIdx; i < MONTH_KEYS.length; i++) {
        monthly[MONTH_KEYS[i]] = salaryNum;
      }

      // Single persist — one settings object, one updateSettings call.
      await updateSettings({
        ...settings,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        monthlySalaries: monthly,
        weeklyHours: hoursNum,
        updatedAt: new Date().toISOString(),
      });

      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/(tabs)');
    } catch (e) {
      console.warn('[onboarding] finish failed', e);
      toast.error(isTr ? 'Kayıt başarısız, tekrar deneyin.' : 'Failed to save, please retry.');
      setFinishing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroIcon}
              >
                <Ionicons name="time" size={44} color="#fff" />
              </LinearGradient>
              <Text style={styles.appName}>Mesai+</Text>
              <Text style={styles.tagline}>
                {isTr ? 'Çalışma hayatını tek yerden takip et.' : 'Track your work life from one place.'}
              </Text>
            </View>

            <Text style={styles.sectionLabel}>{isTr ? 'KİŞİSEL BİLGİLER' : 'PERSONAL INFO'}</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>{isTr ? 'Ad' : 'First Name'}</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder={isTr ? 'Adınız' : 'Your first name'}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="words"
                editable={!finishing}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>{isTr ? 'Soyad' : 'Last Name'}</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder={isTr ? 'Soyadınız' : 'Your last name'}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="words"
                editable={!finishing}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>{isTr ? 'E-posta' : 'Email'}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="user@example.com"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!finishing}
              />
            </View>

            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>{isTr ? 'ÇALIŞMA BİLGİLERİ' : 'WORK INFO'}</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>{isTr ? 'Aylık Maaş' : 'Monthly Salary'}</Text>
              <View style={styles.inputRow}>
                <Text style={styles.currency}>₺</Text>
                <TextInput
                  value={salary}
                  onChangeText={setSalary}
                  placeholder={isTr ? 'Örn: 45000' : 'e.g. 45000'}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { flex: 1, paddingVertical: 0 }]}
                  keyboardType="decimal-pad"
                  editable={!finishing}
                />
              </View>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.fieldLabel}>{isTr ? 'Haftalık Çalışma Saati' : 'Weekly Working Hours'}</Text>
              <View style={styles.segment}>
                {WEEKLY_HOUR_PRESETS.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setWeeklyHoursChip(p)}
                    style={[styles.segmentBtn, weeklyHoursChip === p && { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.segmentText, { color: weeklyHoursChip === p ? '#fff' : colors.text }]}>{p}</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setWeeklyHoursChip('other')}
                  style={[styles.segmentBtn, weeklyHoursChip === 'other' && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.segmentText, { color: weeklyHoursChip === 'other' ? '#fff' : colors.text }]}>
                    {isTr ? 'Diğer' : 'Other'}
                  </Text>
                </Pressable>
              </View>
              {weeklyHoursChip === 'other' && (
                <View style={[styles.card, { marginTop: spacing.sm }]}>
                  <TextInput
                    value={weeklyHoursCustom}
                    onChangeText={setWeeklyHoursCustom}
                    placeholder={isTr ? 'Saat girin' : 'Enter hours'}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { textAlign: 'center' }]}
                    keyboardType="decimal-pad"
                    editable={!finishing}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.ctaWrap}>
            <Pressable
              onPress={handleStart}
              disabled={finishing}
              style={({ pressed }) => [{ opacity: pressed || finishing ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>{isTr ? 'Başla' : 'Start'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
            <Text style={styles.footerNote}>
              {isTr ? 'Bilgileriniz yalnızca bu cihazda saklanır.' : 'Your information is stored only on this device.'}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    hero: {
      alignItems: 'center',
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    heroIcon: {
      width: 84,
      height: 84,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    appName: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 4,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: spacing.sm,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    input: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      paddingVertical: 8,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    currency: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.accent,
      marginRight: 8,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '700',
    },
    ctaWrap: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    cta: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: radius.lg,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    ctaText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    footerNote: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
}
