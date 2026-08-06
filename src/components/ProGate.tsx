import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getColors, radius, spacing } from '../theme';
import { useApp } from '../context/AppContext';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  features: string[];
}

export function ProGate({ icon, title, subtitle, features }: Props) {
  const router = useRouter();
  const { theme, language } = useApp();
  const colors = getColors(theme);
  const isTr = language === 'tr';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <LinearGradient colors={[colors.bg, colors.bg2]} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={styles.wrap}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.icon}
        >
          <Ionicons name={icon} size={44} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        <View style={styles.features}>
          {features.map(f => (
            <Text key={f} style={[styles.feature, { color: colors.text }]}>{f}</Text>
          ))}
        </View>
        <Pressable onPress={() => router.push('/upgrade')}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.btn}
          >
            <Ionicons name="star" size={18} color="#FFFFFF" />
            <Text style={styles.btnText}>{isTr ? 'Pro’ya Yükselt' : 'Upgrade to Pro'}</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, alignItems: 'center', paddingTop: spacing.xl },
  icon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  features: { alignSelf: 'stretch', gap: 10, marginBottom: spacing.xl, paddingHorizontal: spacing.md },
  feature: { fontSize: 15, lineHeight: 22 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.full },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
