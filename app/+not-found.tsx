import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { colors, spacing } from '../src/theme';

export default function NotFound() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Sayfa bulunamadı</Text>
      <Link href="/" style={styles.link}>Ana sayfaya dön</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: spacing.md },
  link: { color: colors.accent, fontSize: 16 },
});
