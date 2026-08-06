import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getColors, radius, spacing } from '../theme';

interface Props {
  language: 'tr' | 'en';
  theme: 'dark' | 'light';
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  message?: string;
  buttonLabel?: string;
  onPress?: () => void;
}

export function EmptyState({
  language,
  theme,
  icon = 'time-outline',
  title,
  message,
  buttonLabel,
  onPress,
}: Props) {
  const colors = getColors(theme);
  const isTr = language === 'tr';
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });

  const finalTitle = title ?? (isTr ? 'Henüz kayıt bulunamadı' : 'No records yet');
  const finalMessage =
    message ??
    (isTr
      ? "Mesai girmek için 'Giriş' sekmesini kullanın."
      : "Use the 'Entry' tab to log your work hours.");
  const finalButton = buttonLabel ?? (isTr ? 'Hemen Başla' : 'Get Started');

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.iconWrap}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              borderColor: colors.accent,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.iconCircle,
            {
              backgroundColor: colors.accent + '18',
              borderColor: colors.accent + '40',
              transform: [{ scale }],
            },
          ]}
        >
          <Ionicons name={icon} size={40} color={colors.accent} />
        </Animated.View>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{finalTitle}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{finalMessage}</Text>
      {onPress && (
        <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: spacing.sm }]}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.buttonText}>{finalButton}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  iconWrap: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full ?? 999,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
