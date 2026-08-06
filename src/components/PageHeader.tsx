import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { usePro } from '../context/ProContext';
import { useMenu } from '../context/MenuContext';
import { getColors, radius, spacing } from '../theme';
import { formatTurkishMonth } from '../utils/dates';

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface Props {
  title: string;
  showMonth?: boolean;
  showProButton?: boolean;
  showMenu?: boolean;
}

export function PageHeader({ title, showMonth = true, showProButton = true, showMenu = true }: Props) {
  const { theme, language } = useApp();
  const { isPro } = usePro();
  const { open } = useMenu();
  const router = useRouter();
  const colors = getColors(theme);

  const now = new Date();
  const monthLabel =
    language === 'tr'
      ? formatTurkishMonth(now)
      : `${MONTHS_EN[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
      <View style={styles.wrap}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.row}>
          {showMenu && (
            <Pressable
              onPress={open}
              hitSlop={10}
              accessibilityLabel="Menu"
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="menu" size={20} color={colors.text} />
            </Pressable>
          )}

          {showMonth && (
            <View
              style={[
                styles.monthPill,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.monthText, { color: colors.textMuted }]} numberOfLines={1}>
                {monthLabel}
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }} />

          {showProButton && !isPro && (
            <Pressable
              onPress={() => router.push('/upgrade')}
              accessibilityLabel="Pro"
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.proBtn}
              >
                <Text style={styles.proCrown}>👑</Text>
                <Text style={styles.proText}>Pro</Text>
              </LinearGradient>
            </Pressable>
          )}
          {showProButton && isPro && (
            <View style={[styles.proActive, { backgroundColor: colors.accent + '22', borderColor: colors.accent }]}>
              <Ionicons name="diamond" size={12} color={colors.accent} />
              <Text style={[styles.proActiveText, { color: colors.accent }]}>Pro</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'web' ? spacing.md : spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full ?? 999,
    borderWidth: 1,
  },
  monthText: {
    fontSize: 12,
    fontWeight: '700',
  },
  proBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full ?? 999,
  },
  proCrown: { fontSize: 13 },
  proText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.4 },
  proActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full ?? 999,
    borderWidth: 1,
  },
  proActiveText: { fontSize: 12, fontWeight: '800' },
});
