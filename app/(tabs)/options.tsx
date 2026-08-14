import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { PageHeader } from '../../src/components/PageHeader';
import { LegalDisclaimer } from '../../src/components/LegalDisclaimer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { useToast } from '../../src/context/ToastContext';
import { usePro } from '../../src/context/ProContext';
import { getColors, radius, spacing, PALETTES, PaletteId } from '../../src/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { t } from '../../src/utils/i18n';
import { Switch, Platform } from 'react-native';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  authenticate,
  getBiometricTypeLabel,
} from '../../src/utils/biometric';

export default function OptionsScreen() {
  const navigation = useNavigation<any>();
  const { language, setLanguage, theme, setTheme, refresh, palette, setPalette } = useApp();
  const { isPro } = usePro();
  const router = useRouter();
  const isTr = language === 'tr';

  const colors = getColors(theme);
  const styles = getStyles(colors);

  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light' | 'system'>(theme);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabledState] = useState(false);
  const [bioLabel, setBioLabel] = useState('Face ID / Touch ID');
  const toast = useToast();

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      const avail = await isBiometricAvailable();
      setBioAvailable(avail);
      if (avail) {
        setBioEnabledState(await isBiometricEnabled());
        setBioLabel(await getBiometricTypeLabel(language));
      }
    })();
  }, [language]);

  const handleBiometricToggle = async (val: boolean) => {
    if (val && !isPro) {
      toast.warning(isTr ? 'Bu özellik Pro sürüme özeldir' : 'This feature is Pro only');
      router.push('/upgrade');
      return;
    }
    if (val) {
      const ok = await authenticate(
        isTr ? 'Biyometrik kilidi etkinleştir' : 'Enable biometric lock'
      );
      if (!ok) {
        toast.error(isTr ? 'Doğrulama başarısız' : 'Authentication failed');
        return;
      }
      await setBiometricEnabled(true);
      setBioEnabledState(true);
      toast.success(isTr ? 'Biyometrik kilit etkin' : 'Biometric lock enabled');
    } else {
      await setBiometricEnabled(false);
      setBioEnabledState(false);
      toast.info(isTr ? 'Biyometrik kilit kapatıldı' : 'Biometric lock disabled');
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t(language, 'tab_options'),
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors]);

  useEffect(() => {
    setSelectedLanguage(language);
    setSelectedTheme(theme);
  }, [language, theme]);

  const handleLanguageChange = (lang: any) => {
    setSelectedLanguage(lang);
    setLanguage(lang);
  };

  const handleThemeChange = (thm: 'dark' | 'light' | 'system') => {
    setSelectedTheme(thm);
    setTheme(thm);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <PageHeader title={isTr ? 'Ayarlar' : 'Settings'} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.subtitle, { marginBottom: spacing.md }]}>{t(language, 'app_preferences')}</Text>

        {/* Language Section */}
        <Text style={styles.sectionLabel}>🌐 {t(language, 'language')}</Text>
        <View style={styles.buttonGroup}>
          <Pressable
            onPress={() => handleLanguageChange('tr')}
            style={[
              styles.langButton,
              selectedLanguage === 'tr' && styles.langButtonActive,
            ]}
          >
            <Text
              style={[
                styles.langButtonText,
                selectedLanguage === 'tr' && styles.langButtonTextActive,
              ]}
            >
              Türkçe
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleLanguageChange('en')}
            style={[
              styles.langButton,
              selectedLanguage === 'en' && styles.langButtonActive,
            ]}
          >
            <Text
              style={[
                styles.langButtonText,
                selectedLanguage === 'en' && styles.langButtonTextActive,
              ]}
            >
              English
            </Text>
          </Pressable>
        </View>

        {/* Theme Section */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
          🎨 {t(language, 'theme')}
        </Text>
        <View style={styles.buttonGroup}>
          {([
            { v: 'light' as const, label: isTr ? '☀️ Açık' : '☀️ Light' },
            { v: 'dark' as const, label: isTr ? '🌙 Koyu' : '🌙 Dark' },
            { v: 'system' as const, label: isTr ? '📱 Sistem' : '📱 System' },
          ]).map((opt) => (
            <Pressable
              key={opt.v}
              onPress={() => handleThemeChange(opt.v)}
              style={[
                styles.langButton,
                selectedTheme === opt.v && styles.langButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.langButtonText,
                  selectedTheme === opt.v && styles.langButtonTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Palette Section */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
          🎨 {isTr ? 'Renk Paleti' : 'Color Palette'}
          {!isPro && (
            <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>
              {'  '}✨ Pro
            </Text>
          )}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(Object.keys(PALETTES) as PaletteId[]).map((pid) => {
            const p = PALETTES[pid];
            const locked = !p.free && !isPro;
            const selected = palette === pid;
            return (
              <Pressable
                key={pid}
                onPress={async () => {
                  if (locked) {
                    router.push('/upgrade');
                    return;
                  }
                  await setPalette(pid);
                }}
                style={{
                  width: '48%',
                  borderRadius: radius.md,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? p.accent : colors.border,
                  overflow: 'hidden',
                  opacity: locked ? 0.7 : 1,
                }}
              >
                <LinearGradient
                  colors={[p.primary, p.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: spacing.md, minHeight: 76, justifyContent: 'space-between' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                    {locked ? (
                      <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
                    ) : selected ? (
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    {isTr ? p.nameTr : p.name}
                  </Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        {/* Security Section */}
        {bioAvailable && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
              🔒 {isTr ? 'Güvenlik' : 'Security'}
            </Text>
            <View style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                  {bioLabel}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  {isTr
                    ? 'Uygulamayı açarken biyometrik doğrulama iste'
                    : 'Require biometric authentication on app open'}
                </Text>
              </View>
              <Switch
                value={bioEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={bioEnabled ? colors.accent : '#f4f3f4'}
              />
            </View>
          </>
        )}

        {/* About Section */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
          ℹ️ {t(language, 'about')}
        </Text>
        <View style={styles.card}>
          <Text style={styles.aboutTitle}>📊 {t(language, 'app_info')}</Text>
          <Text style={styles.aboutText}>
            {t(language, 'app_description')}
          </Text>
          <Text style={[styles.aboutText, { marginTop: spacing.sm }]}>
            {t(language, 'features')}
          </Text>
          <Text style={styles.aboutText}>
            {t(language, 'feature_report')}{'\n'}{t(language, 'feature_payroll')}{'\n'}
            {t(language, 'feature_calculators')}{'\n'}{t(language, 'feature_leave')}{'\n'}
            {t(language, 'feature_holidays')}{'\n'}{t(language, 'feature_logo')}{'\n'}
            {t(language, 'feature_backup')}{'\n'}{t(language, 'feature_notifications')}{'\n'}
            {t(language, 'feature_theme')}{'\n'}{t(language, 'feature_language')}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/privacy')}
          style={({ pressed }) => [
            styles.card,
            { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} style={{ marginRight: spacing.sm }} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }}>
            {isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/terms')}
          style={({ pressed }) => [
            styles.card,
            { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.accent} style={{ marginRight: spacing.sm }} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }}>
            {isTr ? 'Kullanım Koşulları' : 'Terms of Use'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <LegalDisclaimer />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(colors: typeof import('../../src/theme').darkColors) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    emoji: {
      fontSize: 36,
      marginBottom: spacing.sm,
    },
    pageTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: spacing.xs,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
    },
    sectionLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: spacing.md,
    },
    buttonGroup: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    langButton: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    langButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '20',
    },
    langButtonText: {
      color: colors.textMuted,
      fontWeight: '700',
      fontSize: 14,
    },
    langButtonTextActive: {
      color: colors.accent,
    },
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    themeDetail: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    aboutTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },
    aboutText: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: spacing.sm,
    },
  });
}
