import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { spacing } from '../theme';

export function LegalDisclaimer() {
  const { language, theme } = useApp();
  const isTr = language === 'tr';
  const isDark = theme === 'dark';
  const color = isDark ? 'rgba(255,255,255,0.45)' : '#888888';
  return (
    <View style={styles.wrap}>
      <Text style={[styles.txt, { color }]}>
        {isTr
          ? 'Uygulama tarafından yapılan hesaplamalar bilgilendirme amaçlıdır. Resmi bordro işlemleri için muhasebe biriminize danışınız.'
          : 'Calculations made by this app are for informational purposes only. For official payroll matters, please consult your accounting department.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  txt: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
