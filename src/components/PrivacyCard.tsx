import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, radius, spacing } from '../theme';

interface Props {
  language: 'tr' | 'en';
  theme: 'dark' | 'light';
}

export function PrivacyCard({ language, theme }: Props) {
  const colors = getColors(theme);
  const isTr = language === 'tr';

  const title = isTr ? 'Gizliliğiniz Önceliğimiz' : 'Your Privacy Matters';
  const body = isTr
    ? 'Mesai+, kişisel çalışma ve finans kayıtlarınızı cihazınızda yerel olarak saklar; bu veriler Android sistem yedeklemesine dahil edilmez.'
    : 'Mesai+ stores your personal work and financial records locally on your device; this data is not included in Android system backups.';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.accent + '40' }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accent + '18' }]}>
        <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Ionicons name="lock-closed" size={12} color={colors.accent} />
        </View>
        <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
  },
  body: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
});
