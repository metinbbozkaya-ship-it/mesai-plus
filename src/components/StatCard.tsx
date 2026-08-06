import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getColors, radius, spacing } from '../theme';
import { useApp } from '../context/AppContext';

interface Props {
  label: string;
  value: string;
  accent?: string;
  large?: boolean;
}

export function StatCard({ label, value, accent, large }: Props) {
  const { theme } = useApp();
  const colors = getColors(theme);
  const styles = getStyles(colors);

  return (
    <View style={[styles.card, large && styles.large, accent ? { borderColor: accent } : null]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, large && styles.valueLarge, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function getStyles(colors: typeof import('../theme').darkColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 120,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    large: { paddingVertical: spacing.md + 4 },
    label: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
    value: { color: colors.text, fontSize: 19, fontWeight: '800' },
    valueLarge: { fontSize: 26, letterSpacing: -0.5 },
  });
}
