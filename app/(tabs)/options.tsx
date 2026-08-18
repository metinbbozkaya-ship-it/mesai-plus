import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { PageHeader } from '../../src/components/PageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { getColors, radius, spacing } from '../../src/theme';
import { t } from '../../src/utils/i18n';

export default function OptionsScreen() {
  const navigation = useNavigation<any>();
  const { language, setLanguage, theme, setTheme, refresh } = useApp();
  const isTr = language === 'tr';

  const colors = getColors(theme);
  const styles = getStyles(colors);

  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light' | 'system'>(theme);

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

        {/* Preferences Group */}
        <Text style={styles.groupLabel}>{isTr ? 'TERCİHLER' : 'PREFERENCES'}</Text>

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
        <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
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
    groupLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
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
  });
}
