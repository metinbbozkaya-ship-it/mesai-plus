import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeInLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../src/context/AppContext';
import { useToast } from '../../src/context/ToastContext';
import { getColors, spacing, radius } from '../../src/theme';

export const ONBOARDING_KEY = 'mesai.onboarding.done.v1';

const MONTH_KEYS = [
  'january','february','march','april','may','june',
  'july','august','september','october','november','december',
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { language, theme, setLanguage, setTheme, settings, updateSettings } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);

  const [step, setStep] = useState(0);
  const [salary, setSalary] = useState('');
  const [weeklyHours, setWeeklyHours] = useState('45');
  const [applyToAll, setApplyToAll] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const t = useMemo(() => {
    const tr = language === 'tr';
    return {
      next: tr ? 'Devam Et' : 'Continue',
      back: tr ? 'Geri' : 'Back',
      skip: tr ? 'Atla' : 'Skip',
      finish: tr ? 'Başlayalım' : "Let's Start",
      // Step 0
      welcomeTitle: tr ? "Mesai+'a Hoş Geldin" : 'Welcome to Mesai+',
      welcomeSub: tr
        ? 'Mesai saatlerini takip et,\nhak ettiğin parayı bil.'
        : 'Track your overtime,\nknow what you earn.',
      pickLang: tr ? 'Dil' : 'Language',
      pickTheme: tr ? 'Tema' : 'Theme',
      dark: tr ? 'Koyu' : 'Dark',
      light: tr ? 'Açık' : 'Light',
      // Step 1 salary
      salaryTitle: tr ? 'Aylık Net Maaşın' : 'Monthly Net Salary',
      salarySub: tr
        ? 'Mesai ücretini doğru hesaplamak için aylık net maaşına ihtiyacımız var.'
        : 'We need your monthly net salary to calculate overtime accurately.',
      salaryPlaceholder: tr ? 'Örn: 45000' : 'e.g. 45000',
      applyAll: tr ? 'Tüm aylara uygula' : 'Apply to all months',
      salaryHint: tr
        ? 'İstediğin zaman ayarlardan değiştirebilirsin.'
        : 'You can change this anytime in settings.',
      // Step 2 work pattern
      workTitle: tr ? 'Çalışma Düzenin' : 'Work Pattern',
      workSub: tr
        ? 'Haftalık normal çalışma saatini seç. (Türkiye için varsayılan: 45)'
        : 'Choose your weekly working hours. (Default for Turkey: 45)',
      hoursLabel: tr ? 'Haftalık Saat' : 'Weekly Hours',
      multipliers: tr ? 'Mesai Çarpanları' : 'Overtime Multipliers',
      multiplierInfo: tr
        ? 'Hafta içi 1.5x · Hafta sonu 2x · Resmi tatil 2x\n(İş Kanunu varsayılanları)'
        : 'Weekday 1.5x · Weekend 2x · Public Holiday 2x\n(Labor Code defaults)',
      // Step 3 pro
      proTitle: tr ? 'Mesai+ Pro ile Daha Fazlası' : 'More with Mesai+ Pro',
      proSub: tr
        ? 'Profesyonel özellikleri keşfet — istersen sonra Profil sekmesinden geçiş yapabilirsin.'
        : 'Discover pro features — you can upgrade later from the Profile tab.',
      proFeatures: tr
        ? [
            { i: 'document-text-outline', t: 'Kurumsal PDF Raporlar', d: 'Aylık & yıllık detaylı dökümler' },
            { i: 'calculator-outline', t: 'Bordro & Maaş Hesaplama', d: 'Yıllık net/brüt, prim, kıdem' },
            { i: 'calendar-outline', t: 'Yıllık İzin Takvimi', d: 'Hak edilen izinleri görüntüle' },
            { i: 'cloud-upload-outline', t: 'Veri Yedekleme', d: 'Cihaz değiştirsen bile veri kaybetme' },
            { i: 'remove-circle-outline', t: 'Reklamsız Deneyim', d: 'Tek seferlik ödeme, ömür boyu' },
          ]
        : [
            { i: 'document-text-outline', t: 'Corporate PDF Reports', d: 'Detailed monthly & yearly breakdowns' },
            { i: 'calculator-outline', t: 'Payroll & Salary Tools', d: 'Annual net/gross, bonus, severance' },
            { i: 'calendar-outline', t: 'Annual Leave Calendar', d: 'Track earned leave days' },
            { i: 'cloud-upload-outline', t: 'Data Backup', d: 'Never lose data on device change' },
            { i: 'remove-circle-outline', t: 'Ad-Free Experience', d: 'One-time payment, lifetime' },
          ],
    };
  }, [language]);

  const haptic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const goNext = () => {
    haptic();
    if (step === 1) {
      const num = parseFloat(salary.replace(',', '.'));
      if (!num || num <= 0) {
        toast.warning(language === 'tr' ? 'Devam etmek için geçerli bir maaş giriniz.' : 'Please enter a valid salary to continue.');
        return;
      }
    }
    if (step === 2) {
      const h = parseFloat(weeklyHours);
      if (!h || h <= 0 || h > 80) {
        Alert.alert(
          language === 'tr' ? 'Geçersiz Saat' : 'Invalid Hours',
          language === 'tr'
            ? 'Haftalık saat 1-80 arasında olmalı.'
            : 'Weekly hours must be 1-80.'
        );
        return;
      }
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const goBack = () => {
    haptic();
    if (step > 0) setStep(step - 1);
  };

  const skipToEnd = async () => {
    haptic();
    setStep(3);
  };

  const finishOnboarding = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      const num = parseFloat(salary.replace(',', '.')) || 0;
      const monthly: Record<string, number> = { ...(settings.monthlySalaries || {}) };
      if (applyToAll) {
        MONTH_KEYS.forEach((k) => {
          monthly[k] = num;
        });
      } else {
        const idx = new Date().getMonth();
        monthly[MONTH_KEYS[idx]] = num;
      }
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      await updateSettings({
        ...settings,
        monthlySalaries: monthly as any,
        updatedAt: new Date().toISOString(),
      } as any);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.replace('/(tabs)'), 50);
    } catch (e) {
      console.warn('[onboarding] finish failed', e);
      toast.error(language === 'tr' ? 'Kayıt başarısız, tekrar deneyin.' : 'Failed to save, please retry.');
      setFinishing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={
          theme === 'dark'
            ? ['#0a0a0a', '#171717', '#1f1730', '#0a0a0a']
            : ['#fafafa', '#f4f0ff', '#fff8f0', '#fafafa']
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={{ width: 60 }}>
            {step > 0 && step < 3 && (
              <Pressable onPress={goBack} hitSlop={10} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
            )}
          </View>
          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => {
              const isActive = i === step;
              const isPassed = i < step;
              return (
                <Animated.View
                  key={i}
                  entering={FadeIn.duration(200)}
                  style={[
                    styles.dot,
                    {
                      width: isActive ? 24 : 8,
                      backgroundColor: isActive || isPassed ? colors.accent : colors.border,
                      opacity: isActive ? 1 : isPassed ? 0.6 : 1,
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={{ width: 60, alignItems: 'flex-end' }}>
            {step > 0 && step < 3 && (
              <Pressable onPress={skipToEnd} hitSlop={10}>
                <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600' }}>{t.skip}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 0 && (
              <StepWelcome
                t={t}
                colors={colors}
                styles={styles}
                language={language}
                theme={theme}
                setLanguage={setLanguage}
                setTheme={setTheme}
              />
            )}
            {step === 1 && (
              <StepSalary
                t={t}
                colors={colors}
                styles={styles}
                salary={salary}
                setSalary={setSalary}
                applyToAll={applyToAll}
                setApplyToAll={setApplyToAll}
              />
            )}
            {step === 2 && (
              <StepWork
                t={t}
                colors={colors}
                styles={styles}
                weeklyHours={weeklyHours}
                setWeeklyHours={setWeeklyHours}
              />
            )}
            {step === 3 && <StepPro t={t} colors={colors} styles={styles} />}
          </ScrollView>

          {/* Bottom CTA */}
          <View style={styles.ctaWrap}>
            <Pressable
              onPress={goNext}
              disabled={finishing}
              style={({ pressed }) => [{ opacity: pressed || finishing ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <LinearGradient
                colors={[colors.accent, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>{step === 3 ? t.finish : t.next}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── GlowRing: animated pulse behind hero icons ────────────────────────────
function GlowRing({ color }: { color: string }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withTiming(1, { duration: 1600 });
    const id = setInterval(() => {
      pulse.value = 0;
      pulse.value = withTiming(1, { duration: 1600 });
    }, 1700);
    return () => clearInterval(id);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.4 }],
    opacity: 0.55 * (1 - pulse.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 110,
          height: 110,
          borderRadius: 32,
          borderWidth: 3,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

// ─── Step 0: Welcome ───────────────────────────────────────────────────────
function StepWelcome({ t, colors, styles, language, theme, setLanguage, setTheme }: any) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.stepWrap}>
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroIconWrap}>
        <GlowRing color={colors.accent} />
        <LinearGradient
          colors={[colors.accent, colors.primary]}
          style={styles.heroIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="time" size={56} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.title}>
        {t.welcomeTitle}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.subtitle}>
        {t.welcomeSub}
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{ marginTop: spacing.xl }}>
        <Text style={styles.sectionLabel}>{t.pickLang}</Text>
        <View style={styles.segment}>
          {[
            { v: 'tr', label: 'Türkçe' },
            { v: 'en', label: 'English' },
          ].map((opt) => (
            <Pressable
              key={opt.v}
              onPress={() => setLanguage(opt.v)}
              style={[styles.segmentBtn, language === opt.v && { backgroundColor: colors.accent }]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: language === opt.v ? '#fff' : colors.text },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).duration(500)} style={{ marginTop: spacing.lg }}>
        <Text style={styles.sectionLabel}>{t.pickTheme}</Text>
        <View style={styles.segment}>
          {[
            { v: 'dark', label: t.dark, icon: 'moon' },
            { v: 'light', label: t.light, icon: 'sunny' },
          ].map((opt: any) => (
            <Pressable
              key={opt.v}
              onPress={() => setTheme(opt.v)}
              style={[styles.segmentBtn, theme === opt.v && { backgroundColor: colors.accent }]}
            >
              <Ionicons
                name={opt.icon}
                size={16}
                color={theme === opt.v ? '#fff' : colors.text}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: theme === opt.v ? '#fff' : colors.text },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Step 1: Salary ────────────────────────────────────────────────────────
function StepSalary({ t, colors, styles, salary, setSalary, applyToAll, setApplyToAll }: any) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.stepWrap}>
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroIconWrap}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.heroIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="cash" size={52} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.title}>
        {t.salaryTitle}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.subtitle}>
        {t.salarySub}
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.inputCard}>
        <Text style={styles.currency}>₺</Text>
        <TextInput
          style={styles.input}
          value={salary}
          onChangeText={setSalary}
          placeholder={t.salaryPlaceholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          autoFocus
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).duration(500)}>
        <Pressable
          onPress={() => setApplyToAll(!applyToAll)}
          style={styles.checkRow}
        >
          <View
            style={[
              styles.checkbox,
              { backgroundColor: applyToAll ? colors.accent : 'transparent', borderColor: applyToAll ? colors.accent : colors.border },
            ]}
          >
            {applyToAll && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.checkLabel}>{t.applyAll}</Text>
        </Pressable>
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(600).duration(500)} style={styles.hint}>
        💡 {t.salaryHint}
      </Animated.Text>
    </Animated.View>
  );
}

// ─── Step 2: Work Pattern ──────────────────────────────────────────────────
function StepWork({ t, colors, styles, weeklyHours, setWeeklyHours }: any) {
  const presets = [40, 45, 48];
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.stepWrap}>
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroIconWrap}>
        <LinearGradient
          colors={['#F97316', '#EF4444']}
          style={styles.heroIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="briefcase" size={50} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.title}>
        {t.workTitle}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.subtitle}>
        {t.workSub}
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{ marginTop: spacing.lg }}>
        <Text style={styles.sectionLabel}>{t.hoursLabel}</Text>
        <View style={styles.segment}>
          {presets.map((p) => (
            <Pressable
              key={p}
              onPress={() => setWeeklyHours(String(p))}
              style={[styles.segmentBtn, weeklyHours === String(p) && { backgroundColor: colors.accent }]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: weeklyHours === String(p) ? '#fff' : colors.text },
                ]}
              >
                {p}h
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={[styles.inputCard, { marginTop: spacing.md }]}>
          <TextInput
            style={[styles.input, { textAlign: 'center' }]}
            value={weeklyHours}
            onChangeText={setWeeklyHours}
            keyboardType="numeric"
            placeholder="45"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(500).duration(500)}
        style={[styles.infoCard, { marginTop: spacing.lg }]}
      >
        <Text style={[styles.sectionLabel, { marginBottom: 6 }]}>⚙️ {t.multipliers}</Text>
        <Text style={[styles.subtitle, { fontSize: 13, textAlign: 'left', lineHeight: 19, marginTop: 0 }]}>
          {t.multiplierInfo}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Step 3: Pro Features ──────────────────────────────────────────────────
function StepPro({ t, colors, styles }: any) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.stepWrap}>
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroIconWrap}>
        <LinearGradient
          colors={['#7C3AED', '#EC4899']}
          style={styles.heroIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={50} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.title}>
        {t.proTitle}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.subtitle}>
        {t.proSub}
      </Animated.Text>

      <View style={{ marginTop: spacing.lg, gap: 10 }}>
        {t.proFeatures.map((f: any, idx: number) => (
          <Animated.View
            key={f.t}
            entering={FadeInRight.delay(400 + idx * 90).duration(450)}
            style={styles.proRow}
          >
            <View style={[styles.proIcon, { backgroundColor: colors.accent + '22' }]}>
              <Ionicons name={f.i} size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.proTitle}>{f.t}</Text>
              <Text style={styles.proDesc}>{f.d}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
function getStyles(colors: any) {
  return StyleSheet.create({
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    stepWrap: {
      paddingTop: spacing.md,
      alignItems: 'stretch',
    },
    heroIconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      minHeight: 130,
    },
    heroIcon: {
      width: 110,
      height: 110,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 22,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 8,
      letterSpacing: 0.3,
      textTransform: 'uppercase' as const,
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
      flexDirection: 'row',
      paddingVertical: 12,
      borderRadius: radius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    segmentText: { fontSize: 15, fontWeight: '600' },
    inputCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    currency: { fontSize: 24, fontWeight: '700', color: colors.accent, marginRight: 8 },
    input: {
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      paddingVertical: 16,
    },
    checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    checkLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
    hint: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: spacing.md,
      textAlign: 'center',
      lineHeight: 19,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    proRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: 12,
    },
    proIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    proTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    proDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    ctaWrap: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    cta: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: radius.lg,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    ctaText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  });
}
